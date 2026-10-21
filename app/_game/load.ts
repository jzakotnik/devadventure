import type { Process } from "./schema"
import { readGame } from "./store"
import { validateProcess } from "./validate"

export const DEFAULT_GAME = "modulvorschlag"

export type Loaded =
  | { ok: true; proc: Process; source: "bundled" | "saved" }
  | { ok: false; name: string; errors: string[]; missing?: boolean }

/**
 * Loads `app/_content/<name>.json` or a game saved by the editor in
 * `data/games/<name>.json`, and validates it. Server-side only.
 * Every such JSON file is a playable game: `/?game=<name>`.
 */
export async function loadProcess(name: string | undefined): Promise<Loaded> {
  const game = name || DEFAULT_GAME
  if (!/^[a-z0-9_-]+$/i.test(game))
    return {
      ok: false,
      name: game,
      errors: ["invalid game name"],
      missing: true,
    }
  const found = await readGame(game)
  if (!found)
    return {
      ok: false,
      name: game,
      errors: [`no game definition "${game}" (app/_content or data/games)`],
      missing: true,
    }
  const proc = found.proc
  let errors: string[]
  try {
    errors = validateProcess(proc)
  } catch (e) {
    errors = [`invalid structure: ${e instanceof Error ? e.message : e}`]
  }
  return errors.length
    ? { ok: false, name: game, errors }
    : { ok: true, proc, source: found.source }
}
