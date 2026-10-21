"use client"

import { useEffect, useState } from "react"
import styles from "../menu.module.css"

interface GameInfo {
  id: string
  title: string
  subtitle: string
  source: "bundled" | "saved"
}

/** Launcher: play one of the available games, or design a new one. */
export function Menu({
  games,
  canEdit,
}: {
  games: GameInfo[]
  canEdit: boolean
}) {
  const [step, setStep] = useState<"main" | "play">("main")
  const [sel, setSel] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step === "main") {
        if (e.key === "Enter" || e.key === "1") setStep("play")
        else if (e.key === "2" && canEdit) location.href = "/editor"
        return
      }
      if (e.key === "ArrowDown")
        setSel((i) => Math.min(games.length - 1, i + 1))
      else if (e.key === "ArrowUp") setSel((i) => Math.max(0, i - 1))
      else if (e.key === "Enter" && games[sel])
        location.href = `/?game=${games[sel].id}`
      else if (e.key === "Escape") setStep("main")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, sel, games, canEdit])

  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <h1 className={styles.logo}>PROZESS QUEST</h1>
        <h2 className={styles.sub}>Lerne Abläufe spielerisch kennen</h2>

        {step === "main" && (
          <div className={styles.menu}>
            <button className={styles.primary} onClick={() => setStep("play")}>
              ▶ BESTEHENDES SPIEL SPIELEN
            </button>
            {canEdit ? (
              <a className={styles.secondary} href="/editor">
                ✎ NEUES SPIEL GESTALTEN
              </a>
            ) : (
              <span className={styles.disabled}>
                ✎ NEUES SPIEL GESTALTEN (deaktiviert)
              </span>
            )}
          </div>
        )}

        {step === "play" && (
          <>
            {games.length === 0 ? (
              <p className={styles.hint}>Keine Spiele gefunden.</p>
            ) : (
              <ul className={styles.list}>
                {games.map((g, i) => (
                  <li key={g.id}>
                    <a
                      href={`/?game=${g.id}`}
                      className={i === sel ? styles.itemOn : styles.item}
                      onMouseEnter={() => setSel(i)}
                    >
                      <span className={styles.itemTitle}>
                        {i === sel ? "▶ " : "  "}
                        {g.title}
                      </span>
                      <span className={styles.itemSub}>
                        {g.subtitle}
                        {g.source === "saved" ? " · eigenes Spiel" : ""}
                      </span>
                    </a>
                    {canEdit && (
                      <a
                        className={styles.edit}
                        href={`/editor?game=${g.id}`}
                        title="Im Editor öffnen"
                      >
                        ✎
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button className={styles.ghost} onClick={() => setStep("main")}>
              ← ZURÜCK [ESC]
            </button>
          </>
        )}
        <p className={styles.hint}>
          {step === "main"
            ? "ENTER / 1 = SPIELEN" + (canEdit ? " · 2 = GESTALTEN" : "")
            : "↑↓ AUSWÄHLEN · ENTER = START"}
        </p>
      </div>
    </main>
  )
}
