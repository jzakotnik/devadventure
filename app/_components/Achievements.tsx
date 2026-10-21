"use client"

import { useEffect } from "react"
import { uiOf } from "../_game/engine"
import type { Process } from "../_game/schema"
import styles from "../game.module.css"

export function Achievements({
  proc,
  unlocked,
  thisRun,
  onClose,
}: {
  proc: Process
  unlocked: string[]
  thisRun: string[]
  onClose: () => void
}) {
  const ui = uiOf(proc)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className={styles.gallery} onClick={onClose}>
      <div className={styles.galleryBox} onClick={(e) => e.stopPropagation()}>
        <h2>
          🏆 {ui.achievements} {unlocked.length}/{proc.achievements.length}
        </h2>
        <ul className={styles.achGrid}>
          {proc.achievements.map((a) => {
            const got = unlocked.includes(a.id)
            return (
              <li key={a.id} className={got ? styles.achOn : styles.achOff}>
                <span className={styles.achIcon}>{got ? a.icon : "🔒"}</span>
                <div>
                  <b>
                    {got ? a.title : "???"}
                    {thisRun.includes(a.id) ? " · NEU" : ""}
                  </b>
                  <div>{a.description}</div>
                </div>
              </li>
            )
          })}
        </ul>
        <button className={styles.startBtn} onClick={onClose}>
          {ui.back}
        </button>
      </div>
    </div>
  )
}
