"use client"

import type { ReactNode } from "react"
import styles from "../../editor.module.css"

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Path = Array<string | number>

export interface TreeCtx {
  root: any
  set: (path: Path, value: any) => void
  remove: (path: Path) => void
}

/* ------------------------------------------------------------- immutable */

export function getIn(o: any, path: Path): any {
  return path.reduce((a, k) => (a == null ? a : a[k]), o)
}

export function setIn(o: any, path: Path, v: any): any {
  if (!path.length) return v
  const [k, ...rest] = path
  const copy = Array.isArray(o) ? [...o] : { ...o }
  copy[k as any] = setIn(o?.[k], rest, v)
  return copy
}

export function removeIn(o: any, path: Path): any {
  const parentPath = path.slice(0, -1)
  const key = path[path.length - 1]
  const parent = getIn(o, parentPath)
  const next = Array.isArray(parent)
    ? parent.filter((_: any, i: number) => i !== key)
    : Object.fromEntries(Object.entries(parent).filter(([k]) => k !== key))
  return setIn(o, parentPath, next)
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/* ------------------------------------------------------------ knowledge */

const ENUMS: Record<string, string[]> = {
  tone: ["good", "bad", "info"],
  ending: ["success", "failed"],
  finished: ["success", "failed"],
  role: ["hint", "fact"],
  facing: ["up", "down", "left", "right"],
  accessory: ["glasses", "tie", "bow", "cap"],
}

const COLOR_KEYS = new Set(["color", "shirt", "pants", "hair", "skin"])
const TEXT_KEYS = new Set([
  "text",
  "reply",
  "learn",
  "hint",
  "fact",
  "objective",
  "message",
  "description",
  "successText",
  "failedText",
])

/** Short German explanations of the less obvious fields. */
const GLOSS: Record<string, string> = {
  result: "Ergebnis-Schlüssel; muss in „on“ der Phase vorkommen",
  goto: "weiter mit diesem Dialogknoten",
  next: "nächster Dialogknoten bzw. nächste Phase",
  costsRound: "kostet eine Überarbeitungsrunde",
  docVersion: "Dokumentversion +n",
  giveDoc: "Spieler erhält das Dokument",
  when: "Bedingung; die erste passende Variante gilt",
  round: "Runden ± (Ereignisse)",
  flag: "setzt eine Markierung (für Erfolge/Bedingungen)",
  role: "hint = verkauft Tipps, fact = liefert Fakten",
  weight: "Gewichtung bei der Zufallsauswahl",
  roundLimit: "mehr Runden beenden das Spiel erfolglos",
  repeatDialog: "Dialog beim erneuten Besuch",
  on: "Ergebnis → Wirkung",
  minSteps: "Schritte zwischen Ereignissen (min)",
  maxSteps: "Schritte zwischen Ereignissen (max)",
  maxPerRun: "max. Ereignisse pro Spiel",
  stat: "Statistik (talks, steps, hints, facts, …)",
  document: "Name des Dokuments im HUD; leer = ausblenden",
  start: "Startposition [x, y]",
  at: "Position [x, y]",
  rect: "[x, y, Breite, Höhe] in Kacheln",
}

function isLongText(key: string, v: unknown): boolean {
  return (
    typeof v === "string" &&
    (TEXT_KEYS.has(key) || v.length > 70 || v.includes("\n"))
  )
}

/** Enough rows to show the whole text without scrolling (4–16). */
function rowsFor(text: string): number {
  const lines = text
    .split("\n")
    .reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 90)), 0)
  return Math.min(16, Math.max(4, lines + 1))
}

function idsOf(root: any) {
  return {
    rooms: (root.rooms ?? []).map((r: any) => r.id) as string[],
    npcs: Object.keys(root.npcs ?? {}),
    stages: (root.stages ?? []).map((s: any) => s.id) as string[],
    dialogs: Object.keys(root.dialogs ?? {}),
  }
}

/** Options for a string field that references something else (or an enum). */
function optionsFor(path: Path, root: any): string[] | null {
  const key = path[path.length - 1]
  const parent = path[path.length - 2]
  const ids = idsOf(root)
  if (typeof key === "string") {
    if (ENUMS[key]) return ENUMS[key]
    if (key === "firstStage") return ids.stages
    if (key === "room") return ids.rooms
    if (key === "npc") return ids.npcs
    if (key === "dialog" || key === "repeatDialog" || key === "goto")
      return ids.dialogs
    if (key === "next") return path[0] === "dialogs" ? ids.dialogs : ids.stages
  }
  if (typeof key === "number" && parent === "stages" && path.length > 2)
    return ids.stages
  return null
}

/** Optional fields that can be added to the object at `path`. */
function optionalFor(path: Path, root: any): Record<string, any> {
  const key = path[path.length - 1]
  const parent = path[path.length - 2]
  const ids = idsOf(root)
  if (parent === "choices")
    return {
      reply: "",
      learn: "",
      result: "",
      goto: ids.dialogs[0] ?? "",
      round: 0,
      flag: "",
    }
  const onEntry =
    path[0] === "stages" &&
    path[2] === "on" &&
    (path.length === 4 || path.length === 5)
  if (onEntry)
    return {
      when: {},
      next: ids.stages[0] ?? "",
      costsRound: true,
      docVersion: 1,
      giveDoc: true,
      score: 0,
      ending: "success",
      message: "",
      tone: "info",
    }
  if (path[0] === "stages" && path.length === 2) return { repeatDialog: "" }
  if (path[0] === "npcs" && path.length === 2)
    return { role: "hint", facing: "down" }
  if (key === "look") return { accessory: "glasses" }
  if (path[0] === "dialogs" && path.length === 2)
    return { next: "", result: "" }
  if (path[0] === "events" && path.length === 2)
    return { stages: [], requiresDoc: true, weight: 1 }
  if (key === "rule" || key === "when")
    return {
      stat: "talks",
      gte: 1,
      statAtMost: {},
      finished: "success",
      roundsAtMost: 0,
      roundsAtLeast: 0,
      scoreAtLeast: 0,
      scoreAtMost: 0,
      flag: "",
      roomsVisited: 1,
    }
  return {}
}

function uniqueId(base: string, taken: string[]) {
  let i = 1
  while (taken.includes(`${base}${i}`)) i++
  return `${base}${i}`
}

function newItem(path: Path, list: any[], root: any): any {
  const key = path[path.length - 1]
  const ids = idsOf(root)
  if (key === "choices") return { text: "", score: 0 }
  if (key === "stages" && path.length === 1)
    return {
      id: uniqueId("phase", ids.stages),
      title: "",
      room: ids.rooms[0] ?? "",
      npc: ids.npcs[0] ?? "",
      objective: "",
      hint: "",
      fact: "",
      dialog: ids.dialogs[0] ?? "",
      on: {},
    }
  if (key === "stages") return ids.stages[0] ?? ""
  if (key === "pipeline") return { label: "", stages: [] }
  const last = list[list.length - 1]
  if (last === undefined) return ""
  if (typeof last === "string") return ""
  if (typeof last === "number") return 0
  const item = clone(last)
  if (typeof item?.id === "string")
    item.id = uniqueId(
      "neu",
      list.map((x) => x.id)
    )
  return item
}

/** Objects whose keys are user-defined ids. */
function recordTemplate(path: Path, root: any): any | undefined {
  if (path.length === 1 && path[0] === "npcs") {
    const first = Object.values(root.npcs ?? {})[0]
    return first ? { ...clone(first as any), name: "Neu", title: "" } : {}
  }
  if (path.length === 1 && path[0] === "dialogs")
    return { text: "", choices: [{ text: "", score: 0 }] }
  if (path[0] === "stages" && path[2] === "on" && path.length === 3)
    return { message: "", tone: "info" }
  return undefined
}

/* ------------------------------------------------------------- rendering */

function labelOf(v: any, i: string | number): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const s = v.id ?? v.name ?? v.title ?? v.label ?? v.text
    if (typeof s === "string" && s) return `${i} · ${s.slice(0, 50)}`
  }
  return String(i)
}

const isNumArray = (v: any) =>
  Array.isArray(v) && v.length <= 4 && v.every((x) => typeof x === "number")

function Field({
  name,
  hint,
  children,
  wide,
}: {
  name: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span className={styles.fieldName}>
        {name}
        {hint && <small> {hint}</small>}
      </span>
      {children}
    </label>
  )
}

function Primitive({
  value,
  path,
  ctx,
}: {
  value: any
  path: Path
  ctx: TreeCtx
}) {
  const key = String(path[path.length - 1])
  const hint =
    typeof path[path.length - 1] === "string" ? GLOSS[key] : undefined
  const set = (v: any) => ctx.set(path, v)

  if (typeof value === "boolean")
    return (
      <Field name={key} hint={hint}>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => set(e.target.checked)}
        />
      </Field>
    )
  if (typeof value === "number")
    return (
      <Field name={key} hint={hint}>
        <input
          className={styles.input}
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => set(Number(e.target.value))}
        />
      </Field>
    )
  const str = value == null ? "" : String(value)
  const opts = optionsFor(path, ctx.root)
  if (opts)
    return (
      <Field name={key} hint={hint}>
        <select
          className={styles.input}
          value={str}
          onChange={(e) => set(e.target.value)}
        >
          {!opts.includes(str) && <option value={str}>{str || "—"}</option>}
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    )
  if (COLOR_KEYS.has(key) && /^#[0-9a-f]{6}$/i.test(str))
    return (
      <Field name={key} hint={hint}>
        <span className={styles.colorRow}>
          <input
            type="color"
            value={str}
            onChange={(e) => set(e.target.value)}
          />
          <code>{str}</code>
        </span>
      </Field>
    )
  const isMapRow = path[0] === "map" && path[1] === "layout"
  if (isLongText(key, str))
    return (
      <Field name={key} hint={hint} wide>
        <textarea
          className={styles.input}
          rows={rowsFor(str)}
          value={str}
          onChange={(e) => set(e.target.value)}
        />
      </Field>
    )
  return (
    <Field name={isMapRow ? `Zeile ${key}` : key} hint={hint}>
      <input
        className={isMapRow ? `${styles.input} ${styles.mono}` : styles.input}
        value={str}
        spellCheck={!isMapRow}
        onChange={(e) => set(e.target.value)}
      />
    </Field>
  )
}

function AddOptional({
  value,
  path,
  ctx,
}: {
  value: any
  path: Path
  ctx: TreeCtx
}) {
  const options = optionalFor(path, ctx.root)
  const free = Object.keys(options).filter((k) => !(k in value))
  if (!free.length) return null
  return (
    <select
      className={styles.addSelect}
      value=""
      onChange={(e) => {
        if (e.target.value)
          ctx.set(path, { ...value, [e.target.value]: options[e.target.value] })
      }}
    >
      <option value="">+ Feld …</option>
      {free.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  )
}

export function Tree({
  value,
  path,
  ctx,
  open = false,
}: {
  value: any
  path: Path
  ctx: TreeCtx
  open?: boolean
}) {
  const key = path[path.length - 1]
  const keyName = String(key)

  if (value === null || typeof value !== "object")
    return <Primitive value={value} path={path} ctx={ctx} />

  if (isNumArray(value))
    return (
      <Field name={keyName} hint={GLOSS[keyName]}>
        <span className={styles.numRow}>
          {value.map((n: number, i: number) => (
            <input
              key={i}
              className={styles.input}
              type="number"
              value={n}
              onChange={(e) => ctx.set([...path, i], Number(e.target.value))}
            />
          ))}
        </span>
      </Field>
    )

  if (Array.isArray(value)) {
    const onList = path[0] === "stages" && path[2] === "on"
    const flat = value.every((x) => typeof x === "string")
    return (
      <Group
        title={onList ? "Varianten" : keyName}
        hint={onList ? "die erste passende Bedingung gilt" : undefined}
        open={open}
        actions={
          onList &&
          value.length === 1 &&
          !value[0]?.when && (
            <button
              className={styles.mini}
              onClick={() => ctx.set(path, value[0])}
            >
              → einzelne Wirkung
            </button>
          )
        }
      >
        {value.map((item, i) => (
          <div key={i} className={flat ? styles.flatItem : undefined}>
            {typeof item === "object" && item !== null ? (
              <Group
                title={labelOf(item, i)}
                open={false}
                actions={
                  <button
                    className={styles.miniDanger}
                    onClick={() => ctx.remove([...path, i])}
                  >
                    ✕
                  </button>
                }
              >
                <Tree value={item} path={[...path, i]} ctx={ctx} />
              </Group>
            ) : (
              <>
                <Tree value={item} path={[...path, i]} ctx={ctx} />
                <button
                  className={styles.miniDanger}
                  onClick={() => ctx.remove([...path, i])}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
        <button
          className={styles.mini}
          onClick={() =>
            ctx.set(path, [...value, newItem(path, value, ctx.root)])
          }
        >
          + hinzufügen
        </button>
      </Group>
    )
  }

  // object
  const template = recordTemplate(path, ctx.root)
  const isRecord = template !== undefined
  const onEntry = path[0] === "stages" && path[2] === "on" && path.length === 4
  const entries = Object.entries(value)
  const body = (
    <>
      {entries.map(([k, v]) => {
        const p = [...path, k]
        const nested = v !== null && typeof v === "object" && !isNumArray(v)
        return nested ? (
          <Group
            key={k}
            title={isRecord ? labelOf(v, k) : k}
            hint={GLOSS[k]}
            open={!isRecord && !Array.isArray(v)}
            actions={
              (isRecord || optionalFor(path, ctx.root)[k] !== undefined) && (
                <button
                  className={styles.miniDanger}
                  onClick={() => ctx.remove(p)}
                >
                  ✕
                </button>
              )
            }
          >
            <Tree value={v} path={p} ctx={ctx} />
          </Group>
        ) : (
          <div
            key={k}
            className={
              isLongText(k, v)
                ? `${styles.fieldRow} ${styles.fieldRowWide}`
                : styles.fieldRow
            }
          >
            <Tree value={v} path={p} ctx={ctx} />
            {optionalFor(path, ctx.root)[k] !== undefined && (
              <button
                className={styles.miniDanger}
                title="Feld entfernen"
                onClick={() => ctx.remove(p)}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
      <div className={styles.actionRow}>
        {!isRecord && <AddOptional value={value} path={path} ctx={ctx} />}
        {isRecord && (
          <button
            className={styles.mini}
            onClick={() => {
              const id = window.prompt("Neue ID (Buchstaben, Ziffern, _):")
              if (!id || id in value) return
              ctx.set(path, { ...value, [id]: clone(template) })
            }}
          >
            + Eintrag
          </button>
        )}
        {onEntry && (
          <button
            className={styles.mini}
            onClick={() => ctx.set(path, [value])}
          >
            → bedingte Liste
          </button>
        )}
      </div>
    </>
  )
  // The root of a section renders its fields directly.
  return <div className={styles.fields}>{body}</div>
}

function Group({
  title,
  hint,
  open,
  actions,
  children,
}: {
  title: string
  hint?: string
  open: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <details className={styles.group} open={open}>
      <summary>
        <span>
          {title}
          {hint && <small> {hint}</small>}
        </span>
        <span
          className={styles.summaryActions}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </span>
      </summary>
      <div className={styles.groupBody}>{children}</div>
    </details>
  )
}
