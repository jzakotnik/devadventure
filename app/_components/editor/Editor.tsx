"use client"

import { Component, useEffect, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_SCORING, DEFAULT_UI, type Process } from "../../_game/schema"
import { validateProcess } from "../../_game/validate"
import styles from "../../editor.module.css"
import { buildAiPrompt } from "./aiPrompt"
import { TAB_HELP, metaFor } from "./help"
import { Overview } from "./Overview"
import { checkUpload } from "./upload"
import { Tree, removeIn, setIn, type Path } from "./Tree"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GameInfo {
  id: string
  title: string
  source: "bundled" | "saved"
}

const TABS: Array<{ id: string; label: string; keys: string[] }> = [
  { id: "overview", label: "Übersicht", keys: [] },
  {
    id: "general",
    label: "Allgemein",
    keys: [
      "title",
      "subtitle",
      "intro",
      "disclaimer",
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
  disclaimer: [""],
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
  const [tab, setTab] = useState("overview")
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [topic, setTopic] = useState("")
  const [note, setNote] = useState("")
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
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
      setNote("")
      setUploadErrors([])
    }
    setTab(id)
  }

  /** Live check of the text in the JSON tab: syntax, then the game's own rules. */
  const jsonInfo = useMemo(() => {
    if (!jsonText.trim()) return null
    let value: unknown
    try {
      value = JSON.parse(jsonText)
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      }
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
      return {
        ok: false as const,
        error: "Die Datei muss ein JSON-Objekt sein.",
      }
    let problems: string[]
    try {
      problems = validateProcess(value as Process)
    } catch (e) {
      problems = [
        `Struktur unvollständig: ${e instanceof Error ? e.message : e}`,
      ]
    }
    return { ok: true as const, value, problems }
  }, [jsonText])

  const applied =
    jsonInfo?.ok === true &&
    JSON.stringify(jsonInfo.value) === JSON.stringify(proc)

  function applyJson() {
    if (!jsonInfo?.ok) {
      setJsonError(jsonInfo ? jsonInfo.error : "Kein JSON eingegeben.")
      return
    }
    if (jsonInfo.problems.length) {
      setJsonError(
        "Nur ein gültiges Spiel kann übernommen werden. Behebe zuerst die aufgelisteten Probleme."
      )
      return
    }
    setJsonError("")
    setProc(jsonInfo.value)
    setNote("Übernommen. Die anderen Tabs zeigen jetzt diesen Stand.")
  }

  function formatJson() {
    if (jsonInfo?.ok) setJsonText(JSON.stringify(jsonInfo.value, null, 2))
  }

  async function copyText(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } finally {
        document.body.removeChild(ta)
      }
    }
    setNote(done)
  }

  function downloadJson() {
    const text = jsonInfo?.ok
      ? JSON.stringify(jsonInfo.value, null, 2)
      : JSON.stringify(proc, null, 2)
    const name =
      (/^[a-z0-9_-]{1,40}$/i.test(saveId) ? saveId : "spiel") + ".json"
    const url = URL.createObjectURL(
      new Blob([text + "\n"], { type: "application/json" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    setNote(`Heruntergeladen als ${name}.`)
  }

  async function uploadJson(file: File | undefined) {
    if (!file) return
    setJsonError("")
    setNote("")
    const result = await checkUpload(file)
    if (!result.ok) {
      // keep the current game untouched; plain text may be corrected in the box
      if (result.text !== undefined) setJsonText(result.text)
      setUploadErrors(result.errors)
      setNote(
        `„${file.name}“ wurde abgelehnt. Das aktuelle Spiel bleibt unverändert.`
      )
      return
    }
    setUploadErrors([])
    setJsonText(result.text)
    setProc(result.value)
    const base = file.name.replace(/\.json$/i, "")
    if (/^[a-z0-9_-]{1,40}$/i.test(base)) setSaveId(base)
    setSavedId(null)
    setMsg(null)
    setNote(
      `„${file.name}“ geladen und übernommen – alle Prüfungen bestanden. Du kannst es jetzt speichern.`
    )
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
    <div
      className={
        tab === "json" ? `${styles.page} ${styles.pageWide}` : styles.page
      }
    >
      <header className={styles.header}>
        <h1>Spiel-Editor</h1>
        <a href="/" className={styles.link}>
          ← zum Menü
        </a>
      </header>

      <section className={styles.bar}>
        <label>
          Vorlage laden
          <span className={styles.barHelp}>
            Wähle ein bestehendes Spiel als Ausgangspunkt. Änderungen wirken
            erst nach dem Speichern.
          </span>
          <select
            className={styles.input}
            value={from}
            onChange={(e) => load(e.target.value)}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({g.id}
                {g.source === "bundled" ? ", Vorlage" : ", gespeichert"})
              </option>
            ))}
          </select>
        </label>
        <label>
          Speichern als (game=…)
          <span className={styles.barHelp}>
            Name, unter dem das Spiel gespeichert wird; Aufruf dann mit ?game=
            Name. Nur Buchstaben, Ziffern, - und _. Vorlagen lassen sich nicht
            überschreiben.
          </span>
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
      {errors.length > 0 && tab !== "json" && (
        <details className={styles.errBox} open>
          <summary>
            {errors.length} Problem(e) im Spiel – Speichern ist erst möglich,
            wenn sie behoben sind
          </summary>
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

      {TAB_HELP[tab] && (
        <aside className={styles.tabHelp}>
          <b>{TAB_HELP[tab].title}</b>
          {TAB_HELP[tab].text}
        </aside>
      )}

      {proc && tab !== "json" && tab !== "overview" && (
        <main className={styles.sections}>
          {current.keys.map((k) => {
            if (!(k in proc))
              return OPTIONAL_SECTIONS[k] ? (
                <button
                  key={k}
                  className={styles.mini}
                  onClick={() => ctx.set([k], OPTIONAL_SECTIONS[k])}
                >
                  + „{metaFor([k]).label ?? k}“{" "}
                  {k === "disclaimer"
                    ? "hinzufügen"
                    : "anpassen (sonst gelten Standardwerte)"}
                </button>
              ) : null
            const v = proc[k]
            const isObj = v !== null && typeof v === "object"
            return (
              <section key={k} className={styles.section}>
                {isObj && !Array.isArray(v) && (
                  <h2>
                    {metaFor([k]).label ?? k}
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
                {isObj && !Array.isArray(v) && metaFor([k]).help && (
                  <p className={styles.sectionHelp}>{metaFor([k]).help}</p>
                )}
                <Tree value={v} path={[k]} ctx={ctx} open />
              </section>
            )
          })}
        </main>
      )}

      {proc && tab === "overview" && (
        <OverviewGuard key={JSON.stringify(errors)}>
          <Overview proc={proc} onEdit={selectTab} />
        </OverviewGuard>
      )}

      {proc && tab === "json" && (
        <main className={styles.sections}>
          <div className={styles.jsonBar}>
            <button className={styles.tool} onClick={downloadJson}>
              ⬇ Herunterladen
            </button>
            <label className={styles.tool}>
              ⬆ Hochladen
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => {
                  uploadJson(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </label>
            <button
              className={styles.tool}
              onClick={formatJson}
              disabled={!jsonInfo?.ok}
            >
              Formatieren
            </button>
            <button
              className={styles.tool}
              onClick={() =>
                copyText(jsonText, "JSON in die Zwischenablage kopiert.")
              }
            >
              Kopieren
            </button>
            <span className={styles.jsonSpacer} />
            <input
              className={`${styles.input} ${styles.topic}`}
              value={topic}
              placeholder="Prozess für die KI, z. B. Reisekostenabrechnung"
              onChange={(e) => setTopic(e.target.value)}
              aria-label="Prozess, den die KI abbilden soll"
            />
            <button
              className={styles.tool}
              title="Kopiert Regeln, Thema und das aktuelle Spiel als Beispiel – zum Einfügen in eine KI"
              onClick={() => {
                const text = buildAiPrompt(proc, topic)
                copyText(
                  text,
                  `KI-Prompt kopiert (${Math.round(text.length / 1000)} Tsd. Zeichen). In eine KI einfügen, die Antwort als .json speichern und hier hochladen.`
                )
              }}
            >
              ✨ KI-Prompt kopieren
            </button>
          </div>

          {note && (
            <p className={uploadErrors.length ? styles.errBox : styles.okBox}>
              {note}
            </p>
          )}
          {uploadErrors.length > 0 && (
            <ul className={styles.errBox}>
              {uploadErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <textarea
            className={`${styles.input} ${styles.jsonBox}`}
            value={jsonText}
            spellCheck={false}
            wrap="off"
            placeholder="Hier steht das Spiel als JSON. Du kannst eine Datei hochladen oder den Text einer KI einfügen."
            onChange={(e) => {
              setJsonText(e.target.value)
              setJsonError("")
            }}
          />

          <div className={styles.jsonStatus}>
            {!jsonInfo && <span>Kein Inhalt.</span>}
            {jsonInfo && !jsonInfo.ok && (
              <span className={styles.errText}>
                ✘ Syntaxfehler: {jsonInfo.error}
              </span>
            )}
            {jsonInfo?.ok && jsonInfo.problems.length === 0 && (
              <span className={styles.okText}>
                ✔ Gültig – alle Prüfungen bestanden
                {applied ? " (übernommen)" : ""}
              </span>
            )}
            {jsonInfo?.ok && jsonInfo.problems.length > 0 && (
              <span className={styles.errText}>
                ✘ Gültiges JSON, aber {jsonInfo.problems.length} Problem(e) im
                Spiel
                {applied ? " (übernommen)" : ""}
              </span>
            )}
            <span className={styles.jsonMeta}>
              {jsonText.split("\n").length} Zeilen ·{" "}
              {Math.round(jsonText.length / 1000)} KB
            </span>
            <button
              className={styles.primary}
              onClick={applyJson}
              disabled={
                !jsonInfo?.ok || jsonInfo.problems.length > 0 || applied
              }
              title="Den Text in die Formular-Tabs übernehmen (nur wenn alle Prüfungen bestanden sind)"
            >
              {applied ? "Übernommen" : "JSON übernehmen"}
            </button>
          </div>
          {jsonError && <p className={styles.errBox}>{jsonError}</p>}
          {jsonInfo?.ok && jsonInfo.problems.length > 0 && (
            <ul className={styles.errBox}>
              {jsonInfo.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  )
}

/** The overview reads the whole game; half-edited games must not crash the page. */
class OverviewGuard extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p className={styles.warn}>
        Die Übersicht kann für den aktuellen Stand nicht gezeichnet werden.
        Behebe zuerst die gemeldeten Probleme.
      </p>
    ) : (
      this.props.children
    )
  }
}
