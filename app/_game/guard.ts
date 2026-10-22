/**
 * Strict structural checks for game files. They run before every other
 * validation, in the browser (upload, editor) and on the server (save, load),
 * so a file that is not a plain, well-formed game definition is rejected
 * before any other code looks at it.
 *
 * - scanStructure: limits (size of the tree, depth, string length) and
 *   forbidden keys (__proto__, constructor, prototype), control characters.
 * - checkSchema: only known fields, correct types, ranges, colours, ids.
 *
 * Game files are only ever parsed as JSON and re-serialised; nothing in them
 * is executed. These checks keep malformed or hostile input away from the
 * rest of the code.
 */
import { DEFAULT_UI } from "./schema"

export const LIMITS = {
  /** Bytes of a game file (the server enforces the same). */
  bytes: 1_000_000,
  depth: 12,
  nodes: 60_000,
  array: 400,
  keys: 400,
  string: 1500,
} as const

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"])
/** All control characters except tab, line feed and carriage return, plus the Unicode line/paragraph separators. */
const CONTROL = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u2028\\u2029]"
)

const MAX_REPORT = 30

/* ------------------------------------------------------------- structure */

export function scanStructure(root: unknown): string[] {
  const errors: string[] = []
  let nodes = 0
  const add = (msg: string) => {
    if (errors.length < MAX_REPORT) errors.push(msg)
  }
  const walk = (v: unknown, path: string, depth: number): void => {
    if (errors.length >= MAX_REPORT) return
    if (++nodes > LIMITS.nodes) {
      add("Die Datei enthält zu viele Einträge.")
      nodes = -Infinity
      return
    }
    if (typeof v === "string") {
      if (v.length > LIMITS.string)
        add(`${path}: Text ist länger als ${LIMITS.string} Zeichen.`)
      else if (CONTROL.test(v))
        add(`${path}: enthält unzulässige Steuerzeichen.`)
      return
    }
    if (typeof v === "boolean" || v === null) return
    if (typeof v === "number") {
      if (!Number.isFinite(v)) add(`${path}: ungültige Zahl.`)
      return
    }
    if (typeof v !== "object") {
      add(`${path}: nicht erlaubter Datentyp.`)
      return
    }
    if (depth >= LIMITS.depth) {
      add(`${path}: zu tief verschachtelt (max. ${LIMITS.depth} Ebenen).`)
      return
    }
    if (Array.isArray(v)) {
      if (v.length > LIMITS.array) {
        add(`${path}: Liste hat mehr als ${LIMITS.array} Einträge.`)
        return
      }
      v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1))
      return
    }
    const keys = Object.keys(v as object)
    if (keys.length > LIMITS.keys) {
      add(`${path}: mehr als ${LIMITS.keys} Felder.`)
      return
    }
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k)) {
        add(`${path}: verbotener Schlüssel „${k}“.`)
        continue
      }
      if (k.length > 80 || CONTROL.test(k)) {
        add(`${path}: ungültiger Schlüsselname.`)
        continue
      }
      walk((v as Record<string, unknown>)[k], `${path}.${k}`, depth + 1)
    }
  }
  walk(root, "Datei", 0)
  return errors
}

/* ---------------------------------------------------------------- schema */

type Check = (v: unknown, at: string, out: string[]) => void

const fail = (out: string[], at: string, msg: string) => {
  if (out.length < MAX_REPORT) out.push(`${at}: ${msg}`)
}

const str =
  (max = 400, min = 0): Check =>
  (v, at, out) => {
    if (typeof v !== "string") return fail(out, at, "muss Text sein.")
    if (v.length > max) fail(out, at, `Text ist länger als ${max} Zeichen.`)
    else if (v.length < min) fail(out, at, "darf nicht leer sein.")
  }

const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/
const id: Check = (v, at, out) => {
  if (typeof v !== "string" || !ID_PATTERN.test(v))
    return fail(
      out,
      at,
      "muss ein Name aus Buchstaben, Ziffern, - und _ sein (max. 40)."
    )
  // names every object already has (constructor, toString, …) would be found by plain lookups
  if (v in {}) fail(out, at, `„${v}“ ist als Name nicht erlaubt.`)
}

const HEX = /^#[0-9a-fA-F]{6}$/
const hex: Check = (v, at, out) => {
  if (typeof v !== "string" || !HEX.test(v))
    fail(out, at, "muss eine Farbe wie #5a6fa8 sein.")
}

const int =
  (min: number, max: number): Check =>
  (v, at, out) => {
    if (typeof v !== "number" || !Number.isInteger(v))
      return fail(out, at, "muss eine ganze Zahl sein.")
    if (v < min || v > max)
      fail(out, at, `muss zwischen ${min} und ${max} liegen.`)
  }

const num =
  (min: number, max: number): Check =>
  (v, at, out) => {
    if (typeof v !== "number" || !Number.isFinite(v))
      return fail(out, at, "muss eine Zahl sein.")
    if (v < min || v > max)
      fail(out, at, `muss zwischen ${min} und ${max} liegen.`)
  }

const bool: Check = (v, at, out) => {
  if (typeof v !== "boolean") fail(out, at, "muss true oder false sein.")
}

const oneOf =
  (...allowed: string[]): Check =>
  (v, at, out) => {
    if (typeof v !== "string" || !allowed.includes(v))
      fail(out, at, `muss einer von ${allowed.join(", ")} sein.`)
  }

const list =
  (item: Check, max = 200, min = 0): Check =>
  (v, at, out) => {
    if (!Array.isArray(v)) return fail(out, at, "muss eine Liste sein.")
    if (v.length > max) return fail(out, at, `max. ${max} Einträge.`)
    if (v.length < min) return fail(out, at, `mindestens ${min} Eintrag.`)
    v.forEach((x, i) => item(x, `${at}[${i}]`, out))
  }

const tuple =
  (n: number, min: number, max: number): Check =>
  (v, at, out) => {
    if (!Array.isArray(v) || v.length !== n)
      return fail(out, at, `muss eine Liste aus ${n} Zahlen sein.`)
    v.forEach((x, i) => int(min, max)(x, `${at}[${i}]`, out))
  }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v)

/** Object with a fixed set of fields; unknown fields are rejected. */
const shape =
  (spec: Record<string, Check>, required: string[] = []): Check =>
  (v, at, out) => {
    if (!isPlainObject(v)) return fail(out, at, "muss ein Objekt sein.")
    for (const k of required) if (!(k in v)) fail(out, at, `Feld „${k}“ fehlt.`)
    for (const [k, x] of Object.entries(v)) {
      const check = spec[k]
      if (!check) fail(out, at, `unbekanntes Feld „${k}“.`)
      else check(x, `${at}.${k}`, out)
    }
  }

/** Object with user-chosen keys (ids) and one value type. */
const record =
  (item: Check, keyCheck: Check = id, max = 200): Check =>
  (v, at, out) => {
    if (!isPlainObject(v)) return fail(out, at, "muss ein Objekt sein.")
    const keys = Object.keys(v)
    if (keys.length > max) return fail(out, at, `max. ${max} Einträge.`)
    for (const k of keys) {
      keyCheck(k, `${at}.${k} (Name)`, out)
      item(v[k], `${at}.${k}`, out)
    }
  }

const either =
  (a: Check, b: Check): Check =>
  (v, at, out) =>
    Array.isArray(v) ? b(v, at, out) : a(v, at, out)

/* The statistics that conditions and achievements can refer to. */
const STATS = [
  "talks",
  "steps",
  "hints",
  "facts",
  "events",
  "eventsGood",
  "eventsBad",
  "wrongVisits",
  "rooms",
]

const short = str(120)
const long = str(LIMITS.string)

const look = shape(
  {
    shirt: hex,
    pants: hex,
    hair: hex,
    skin: hex,
    accessory: oneOf("glasses", "tie", "bow", "cap"),
  },
  ["shirt", "pants", "hair", "skin"]
)

const rule = shape({
  stat: oneOf(...STATS),
  gte: int(0, 1_000_000),
  statAtMost: record(int(0, 1_000_000), oneOf(...STATS), 12),
  finished: oneOf("success", "failed"),
  roundsAtMost: int(0, 100),
  roundsAtLeast: int(0, 100),
  scoreAtLeast: int(-10_000, 10_000),
  scoreAtMost: int(-10_000, 10_000),
  flag: id,
  roomsVisited: int(0, 20),
})

const effect = shape({
  when: rule,
  next: id,
  costsRound: bool,
  docVersion: int(0, 20),
  giveDoc: bool,
  score: int(-1000, 1000),
  ending: oneOf("success", "failed"),
  message: str(300),
  tone: oneOf("good", "bad", "info"),
})

const choice = shape(
  {
    text: str(500, 1),
    reply: long,
    learn: long,
    score: int(-1000, 1000),
    result: id,
    goto: id,
    round: int(-10, 10),
    flag: id,
  },
  ["text"]
)

const dialogNode = shape(
  {
    text: str(LIMITS.string, 1),
    choices: list(choice, 4),
    next: id,
    result: id,
  },
  ["text"]
)

const stage = shape(
  {
    id,
    title: short,
    room: id,
    npc: id,
    objective: str(300),
    hint: long,
    fact: long,
    dialog: id,
    repeatDialog: id,
    on: record(either(effect, list(effect, 10, 1)), id, 40),
  },
  ["id", "title", "room", "npc", "objective", "hint", "fact", "dialog", "on"]
)

const npc = shape(
  {
    name: short,
    title: short,
    room: id,
    at: tuple(2, 0, 500),
    facing: oneOf("up", "down", "left", "right"),
    look,
    role: oneOf("hint", "fact"),
  },
  ["name", "title", "room", "at", "look"]
)

const event = shape(
  {
    id,
    title: short,
    icon: str(16),
    speaker: shape({ name: short, title: short, look }, [
      "name",
      "title",
      "look",
    ]),
    text: str(LIMITS.string, 1),
    choices: list(choice, 4, 1),
    stages: list(id, 100),
    requiresDoc: bool,
    weight: num(0, 100),
  },
  ["id", "title", "icon", "speaker", "text", "choices"]
)

const achievement = shape(
  { id, title: short, description: str(300), icon: str(16), rule },
  ["id", "title", "description", "icon", "rule"]
)

const uiKeys = Object.keys(DEFAULT_UI)

const processSchema = shape(
  {
    id,
    title: short,
    subtitle: short,
    intro: list(str(600), 12),
    disclaimer: list(str(400), 8),
    roundLimit: int(0, 50),
    firstStage: id,
    pipeline: list(
      shape({ label: short, stages: list(id, 40) }, ["label", "stages"]),
      30
    ),
    texts: shape(
      {
        wrongNpc: long,
        hintPrefix: long,
        factPrefix: long,
        successTitle: short,
        successText: long,
        failedTitle: short,
        failedText: long,
      },
      [
        "wrongNpc",
        "hintPrefix",
        "factPrefix",
        "successTitle",
        "successText",
        "failedTitle",
        "failedText",
      ]
    ),
    map: shape({ layout: list(str(200, 1), 100, 1), start: tuple(2, 0, 500) }, [
      "layout",
      "start",
    ]),
    rooms: list(
      shape({ id, label: short, color: hex, rect: tuple(4, 0, 500) }, [
        "id",
        "label",
        "color",
        "rect",
      ]),
      20,
      1
    ),
    npcs: record(npc, id, 60),
    stages: list(stage, 100, 1),
    dialogs: record(dialogNode, id, 400),
    events: list(event, 60),
    eventSettings: shape(
      {
        minSteps: int(0, 10_000),
        maxSteps: int(0, 10_000),
        maxPerRun: int(0, 100),
      },
      ["minSteps", "maxSteps", "maxPerRun"]
    ),
    achievements: list(achievement, 60),
    ambient: shape(
      {
        greetDistance: num(0, 50),
        cooldownSec: num(0, 3600),
        bubbleSec: num(0, 60),
        lines: list(str(200), 100),
        wanderers: list(
          shape({ id, name: short, start: tuple(2, 0, 500), look }, [
            "id",
            "name",
            "start",
            "look",
          ]),
          30
        ),
      },
      ["greetDistance", "cooldownSec", "bubbleSec", "lines", "wanderers"]
    ),
    scoring: shape({
      hintCost: int(0, 100),
      factBonus: int(0, 100),
      stars: list(
        shape({ roundsAtMost: int(0, 100), stars: int(0, 3) }, [
          "roundsAtMost",
          "stars",
        ]),
        5
      ),
    }),
    ui: shape(Object.fromEntries(uiKeys.map((k) => [k, str(200)]))),
    debrief: shape(
      {
        stats: list(
          shape({ label: short, stat: oneOf(...STATS) }, ["label", "stat"]),
          12
        ),
      },
      ["stats"]
    ),
  },
  [
    "id",
    "title",
    "subtitle",
    "intro",
    "roundLimit",
    "firstStage",
    "pipeline",
    "texts",
    "map",
    "rooms",
    "npcs",
    "stages",
    "dialogs",
    "events",
    "eventSettings",
    "achievements",
    "ambient",
  ]
)

export function checkSchema(value: unknown): string[] {
  const out: string[] = []
  processSchema(value, "Spiel", out)
  return out
}

/** Limits, forbidden keys and the strict schema; empty when the file is acceptable. */
export function checkGameFile(value: unknown): string[] {
  const structure = scanStructure(value)
  if (structure.length) return structure
  return checkSchema(value)
}
