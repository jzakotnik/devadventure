"use client"

import { useEffect, useMemo, useState } from "react"
import { DEFAULT_SCORING, DEFAULT_UI, type Process } from "../../_game/schema"
import { validateProcess } from "../../_game/validate"
import styles from "../../editor.module.css"
import { Tree, removeIn, setIn, type Path } from "./Tree"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GameInfo {
  id: string
  title: string
  source: "bundled" | "saved"
}

const TABS: Array<{ id: string; label: string; keys: string[] }> = [
  {
    id: "general",
    label: "Allgemein",
    keys: [
      "title",
      "subtitle",
      "intro",
      "roundLimit",
      "firstStage",
      "texts",
      "pipeline",
    ],
  },
  { id: "world", label: "Welt", keys: ["map", "rooms", "ambient"] },
  { id: "npcs", label: "Akteure", keys: ["npcs"] },
  { id: "stages", label: "Ablauf", keys: ["stages"] },
  { id: "dialogs", label: "Dialoge", keys: ["dialogs"] },
  {
    id: "extras",
    label: "Ereignisse & Erfolge",
    keys: ["events", "eventSettings", "achievements"],
  },
  { id: "values", label: "Spielwerte", keys: ["scoring", "ui", "debrief"] },
  { id: "json", label: "JSON", keys: [] },
]

const OPTIONAL_SECTIONS: Record<string, any> = {
  scoring: DEFAULT_SCORING,
  ui: DEFAULT_UI,
  debrief: { stats: [{ label: "TIPPS", stat: "hints" }] },
}

export function Editor({
  canSave,
  initialId,
}: {
  canSave: boolean
  initialId?: string
}) {
  const [games, setGames] = useState<GameInfo[]>([])
  const [proc, setProc] = useState<any>(null)
  const [from, setFrom] = useState("")
  const [saveId, setSaveId] = useState("")
  const [tab, setTab] = useState("general")
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string[] } | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch("/api/games")
    const data = await res.json()
    setGames(data.games)
    return data.games as GameInfo[]
  }

  async function load(id: string) {
    const res = await fetch(`/api/games/${id}`)
    if (!res.ok) {
      setMsg({ ok: false, text: [`"${id}" konnte nicht geladen werden`] })
      return
    }
    const data = await res.json()
    setProc(data.proc)
    setFrom(id)
    setSaveId(data.source === "saved" ? id : `${id}-eigene`)
    setSavedId(null)
    setMsg(null)
  }

  useEffect(() => {
    // initial data load
    refresh().then((list) => {
      const first =
        list.find((g) => g.id === initialId) ??
        list.find((g) => g.id === "modulvorschlag") ??
        list[0]
      if (first) load(first.id)
    })
  }, [])

  const errors = useMemo(() => {
    if (!proc) return []
    try {
      return validateProcess(proc as Process)
    } catch (e) {
      return [`Struktur unvollständig: ${e instanceof Error ? e.message : e}`]
    }
  }, [proc])

  const ctx = useMemo(
    () => ({
      root: proc,
      set: (path: Path, value: any) =>
        setProc((p: any) => setIn(p, path, value)),
      remove: (path: Path) => setProc((p: any) => removeIn(p, path)),
    }),
    [proc]
  )

  function selectTab(id: string) {
    if (id === "json") {
      setJsonText(JSON.stringify(proc, null, 2))
      setJsonError("")
    }
    setTab(id)
  }

  function applyJson() {
    try {
      setProc(JSON.parse(jsonText))
      setJsonError("")
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e))
    }
  }

  async function save() {
    setMsg(null)
    const res = await fetch(`/api/games/${encodeURIComponent(saveId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proc),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setSavedId(saveId)
      setMsg({ ok: true, text: [`Gespeichert als „${saveId}“.`] })
      refresh()
    } else {
      setMsg({ ok: false, text: data.errors ?? ["Speichern fehlgeschlagen"] })
    }
  }

  const current = TABS.find((t) => t.id === tab)!
  const idValid = /^[a-z0-9_-]{1,40}$/i.test(saveId)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Spiel-Editor</h1>
        <a href="/" className={styles.link}>
          ← zum Menü
        </a>
      </header>

      <section className={styles.bar}>
        <label>
          Vorlage laden
          <select
            className={styles.input}
            value={from}
            onChange={(e) => load(e.target.value)}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({g.id}
                {g.source === "bundled" ? ", fest" : ", gespeichert"})
              </option>
            ))}
          </select>
        </label>
        <label>
          Speichern als (game=…)
          <input
            className={styles.input}
            value={saveId}
            onChange={(e) => setSaveId(e.target.value)}
          />
        </label>
        <button
          className={styles.primary}
          disabled={!canSave || !idValid || !proc || errors.length > 0}
          onClick={save}
          title={
            !canSave
              ? "Speichern ist deaktiviert (GAME_EDITOR=1 setzen)"
              : errors.length
                ? "Erst die Fehler beheben"
                : ""
          }
        >
          Speichern
        </button>
        <a
          className={styles.primary}
          style={{ visibility: savedId ? "visible" : "hidden" }}
          href={`/?game=${savedId ?? saveId}`}
          target="_blank"
          rel="noreferrer"
        >
          ▶ Spielen: ?game={savedId}
        </a>
      </section>

      {!canSave && (
        <p className={styles.warn}>
          Speichern ist in dieser Umgebung deaktiviert. Setze{" "}
          <code>GAME_EDITOR=1</code>, um es zu erlauben.
        </p>
      )}
      {msg && (
        <ul className={msg.ok ? styles.okBox : styles.errBox}>
          {msg.text.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <details className={styles.errBox} open>
          <summary>{errors.length} Problem(e) im Spiel</summary>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? styles.tabOn : styles.tab}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {proc && tab !== "json" && (
        <main className={styles.sections}>
          {current.keys.map((k) => {
            if (!(k in proc))
              return OPTIONAL_SECTIONS[k] ? (
                <button
                  key={k}
                  className={styles.mini}
                  onClick={() => ctx.set([k], OPTIONAL_SECTIONS[k])}
                >
                  + Abschnitt „{k}“ anpassen (sonst Standardwerte)
                </button>
              ) : null
            const v = proc[k]
            const isObj = v !== null && typeof v === "object"
            return (
              <section key={k} className={styles.section}>
                {isObj && !Array.isArray(v) && (
                  <h2>
                    {k}
                    {OPTIONAL_SECTIONS[k] && (
                      <button
                        className={styles.miniDanger}
                        title="Auf Standardwerte zurücksetzen"
                        onClick={() => ctx.remove([k])}
                      >
                        ✕ Standard
                      </button>
                    )}
                  </h2>
                )}
                <Tree value={v} path={[k]} ctx={ctx} open />
              </section>
            )
          })}
        </main>
      )}

      {proc && tab === "json" && (
        <main className={styles.sections}>
          <textarea
            className={`${styles.input} ${styles.jsonBox}`}
            value={jsonText}
            spellCheck={false}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <div className={styles.actionRow}>
            <button className={styles.primary} onClick={applyJson}>
              JSON übernehmen
            </button>
            {jsonError && <span className={styles.errText}>{jsonError}</span>}
          </div>
        </main>
      )}
    </div>
  )
}
