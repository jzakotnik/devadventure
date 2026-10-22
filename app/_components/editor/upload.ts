import { LIMITS } from "../../_game/guard"
import type { Process } from "../../_game/schema"
import { validateProcess } from "../../_game/validate"

/**
 * Checks a file chosen for upload before anything is loaded into the editor.
 * Only a plain UTF-8 text file with one JSON object that passes the strict
 * structure checks and all game rules is accepted. The file is only ever
 * parsed as JSON; nothing in it is executed.
 */
export type UploadResult =
  | { ok: true; value: Process; text: string }
  /** `text` is set when the file was readable text, so it can be corrected in the JSON box. */
  | { ok: false; errors: string[]; text?: string }

const ALLOWED_TYPES = [
  "",
  "application/json",
  "application/x-json",
  "text/json",
  "text/plain",
]

/** Start bytes of common non-text formats, to give a clear message. */
const SIGNATURES: Array<[string, number[]]> = [
  ["ein Programm (EXE/DLL)", [0x4d, 0x5a]],
  ["ein Programm (ELF)", [0x7f, 0x45, 0x4c, 0x46]],
  ["ein Archiv (ZIP/Office/APK)", [0x50, 0x4b, 0x03, 0x04]],
  ["ein Archiv (gzip)", [0x1f, 0x8b]],
  ["ein PDF", [0x25, 0x50, 0x44, 0x46]],
  ["ein Bild (PNG)", [0x89, 0x50, 0x4e, 0x47]],
  ["ein Bild (JPEG)", [0xff, 0xd8, 0xff]],
  ["ein Bild (GIF)", [0x47, 0x49, 0x46, 0x38]],
  ["ein Skript (#!)", [0x23, 0x21]],
]

export async function checkUpload(file: File): Promise<UploadResult> {
  const reject = (...errors: string[]): UploadResult => ({ ok: false, errors })

  if (!/\.json$/i.test(file.name))
    return reject("Nur Dateien mit der Endung .json sind erlaubt.")
  if (file.size === 0) return reject("Die Datei ist leer.")
  if (file.size > LIMITS.bytes)
    return reject(`Die Datei ist größer als ${LIMITS.bytes / 1_000_000} MB.`)
  if (!ALLOWED_TYPES.includes(file.type))
    return reject(
      `Der Dateityp „${file.type}“ ist nicht erlaubt (erwartet: JSON-Textdatei).`
    )

  const bytes = new Uint8Array(await file.arrayBuffer())
  for (const [what, sig] of SIGNATURES)
    if (sig.every((b, i) => bytes[i] === b))
      return reject(`Das ist keine JSON-Datei, sondern ${what}.`)

  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return reject(
      "Die Datei ist kein gültiger UTF-8-Text (vermutlich eine Binärdatei)."
    )
  }
  text = text.replace(/^﻿/, "")
  if (text.includes("\u0000"))
    return reject("Die Datei enthält Nullbytes und ist keine Textdatei.")
  const trimmed = text.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}"))
    return {
      ok: false,
      errors: ["Die Datei muss ein einzelnes JSON-Objekt enthalten ({ … })."],
      text,
    }

  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch (e) {
    return {
      ok: false,
      errors: [`Syntaxfehler im JSON: ${e instanceof Error ? e.message : e}`],
      text,
    }
  }

  let problems: string[]
  try {
    problems = validateProcess(value as Process)
  } catch (e) {
    problems = [`Struktur unvollständig: ${e instanceof Error ? e.message : e}`]
  }
  if (problems.length) return { ok: false, errors: problems, text }
  return { ok: true, value: value as Process, text }
}
