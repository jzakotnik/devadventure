import type { Process } from "./schema"
import { validateProcess } from "./validate"

export const DEFAULT_GAME = "modulvorschlag"

export type Loaded =
  { ok: true; proc: Process } | { ok: false; name: string; errors: string[] }

/**
 * Loads `app/_content/<name>.json` and validates it. Server-side only.
 * Every JSON file in that folder is a playable game: `/?game=<name>`.
 */
export async function loadProcess(name: string | undefined): Promise<Loaded> {
  const game = name || DEFAULT_GAME
  if (!/^[a-z0-9_-]+$/i.test(game))
    return { ok: false, name: game, errors: ["invalid game name"] }
  let proc: Process
  try {
    proc = (await import(`../_content/${game}.json`)).default as Process
  } catch {
    return {
      ok: false,
      name: game,
      errors: [`no game definition "${game}.json" in app/_content`],
    }
  }
  const errors = validateProcess(proc)
  return errors.length ? { ok: false, name: game, errors } : { ok: true, proc }
}
