import { promises as fs } from "node:fs"
import path from "node:path"
import type { Process } from "./schema"
import { LIMITS, checkGameFile } from "./guard"
import { validateProcess } from "./validate"

/** Server-only. Bundled games are read-only; saved games live in data/games. */
const BUNDLED_DIR = path.join(process.cwd(), "app", "_content")
const SAVED_DIR = path.join(process.cwd(), "data", "games")

export const ID_PATTERN = /^[a-z0-9_-]{1,40}$/i

/** Upper bound for games saved by the editor (protects the disk). */
export const MAX_SAVED_GAMES = 100

export interface GameInfo {
  id: string
  title: string
  subtitle: string
  source: "bundled" | "saved"
}

/** Saving is allowed in dev, or in production when GAME_EDITOR=1. */
export function editorEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" || process.env.GAME_EDITOR === "1"
  )
}

async function readDir(dir: string, source: GameInfo["source"]) {
  let files: string[] = []
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"))
  } catch {}
  const out: GameInfo[] = []
  for (const f of files) {
    const id = f.slice(0, -5)
    if (!ID_PATTERN.test(id)) continue
    try {
      const proc = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"))
      out.push({
        id,
        title: String(proc.title ?? id).slice(0, 120),
        subtitle: String(proc.subtitle ?? "").slice(0, 200),
        source,
      })
    } catch {}
  }
  return out
}

export async function listGames(): Promise<GameInfo[]> {
  const [bundled, saved] = await Promise.all([
    readDir(BUNDLED_DIR, "bundled"),
    readDir(SAVED_DIR, "saved"),
  ])
  const ids = new Set(bundled.map((g) => g.id))
  return [...bundled, ...saved.filter((g) => !ids.has(g.id))]
}

export async function readGame(
  id: string
): Promise<{ proc: Process; source: GameInfo["source"] } | null> {
  if (!ID_PATTERN.test(id)) return null
  for (const [dir, source] of [
    [BUNDLED_DIR, "bundled"],
    [SAVED_DIR, "saved"],
  ] as const) {
    try {
      const file = path.join(dir, `${id}.json`)
      if ((await fs.stat(file)).size > LIMITS.bytes) continue
      const proc = JSON.parse(await fs.readFile(file, "utf8"))
      return { proc, source }
    } catch {}
  }
  return null
}

/** Validates and writes data/games/<id>.json. Returns problems, or [] on success. */
export async function saveGame(id: string, proc: unknown): Promise<string[]> {
  if (!ID_PATTERN.test(id))
    return ["id: only letters, digits, - and _ (max. 40)"]
  const existing = await readGame(id)
  if (existing?.source === "bundled")
    return [`id "${id}" belongs to a built-in game, choose another id`]
  if (!proc || typeof proc !== "object" || Array.isArray(proc))
    return ["body is not an object"]
  // the same strict checks as in the editor: structure, limits, then game rules
  const malformed = checkGameFile(proc)
  if (malformed.length) return malformed
  const game = { ...(proc as Process), id }
  let errors: string[]
  try {
    errors = validateProcess(game)
  } catch (e) {
    errors = [`invalid structure: ${e instanceof Error ? e.message : e}`]
  }
  if (errors.length) return errors

  await fs.mkdir(SAVED_DIR, { recursive: true })
  if (!existing) {
    const count = (await fs.readdir(SAVED_DIR)).filter((f) =>
      f.endsWith(".json")
    ).length
    if (count >= MAX_SAVED_GAMES)
      return [
        `too many saved games (max. ${MAX_SAVED_GAMES}); delete some first`,
      ]
  }
  const text = JSON.stringify(game, null, 2) + "\n"
  if (Buffer.byteLength(text) > LIMITS.bytes) return ["game too large"]
  // write to a temporary file first so a crash never leaves a half-written game
  const target = path.join(SAVED_DIR, `${id}.json`)
  const tmp = `${target}.${process.pid}.tmp`
  await fs.writeFile(tmp, text, { flag: "w", mode: 0o644 })
  await fs.rename(tmp, target)
  return []
}
