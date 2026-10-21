import { promises as fs } from "node:fs"
import path from "node:path"
import type { Process } from "./schema"
import { validateProcess } from "./validate"

/** Server-only. Bundled games are read-only; saved games live in data/games. */
const BUNDLED_DIR = path.join(process.cwd(), "app", "_content")
const SAVED_DIR = path.join(process.cwd(), "data", "games")

export const ID_PATTERN = /^[a-z0-9_-]{1,40}$/i

export interface GameInfo {
  id: string
  title: string
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
      out.push({ id, title: String(proc.title ?? id), source })
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
      const proc = JSON.parse(
        await fs.readFile(path.join(dir, `${id}.json`), "utf8")
      )
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
  if (!proc || typeof proc !== "object") return ["body is not an object"]
  const game = { ...(proc as Process), id }
  let errors: string[]
  try {
    errors = validateProcess(game)
  } catch (e) {
    errors = [`invalid structure: ${e instanceof Error ? e.message : e}`]
  }
  if (errors.length) return errors
  await fs.mkdir(SAVED_DIR, { recursive: true })
  await fs.writeFile(
    path.join(SAVED_DIR, `${id}.json`),
    JSON.stringify(game, null, 2) + "\n"
  )
  return []
}
