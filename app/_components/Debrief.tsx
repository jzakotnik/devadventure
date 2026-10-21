"use client"

import type { GameState } from "../_game/engine"
import { statsView, uiOf } from "../_game/engine"
import type { Process } from "../_game/schema"
import styles from "../game.module.css"

const DEFAULT_DEBRIEF_STATS = [
  { label: "FALSCHE WEGE", stat: "wrongVisits" },
  { label: "TIPPS", stat: "hints" },
]

export function Debrief({
  proc,
  state,
  best,
  onRestart,
  onShowAchievements,
}: {
  proc: Process
  state: GameState
  best: number | null
  onRestart: () => void
  onShowAchievements: () => void
}) {
  const ui = uiOf(proc)
  const view = statsView(state)
  const stats = proc.debrief?.stats ?? DEFAULT_DEBRIEF_STATS
  const f = state.finished!
  const ok = f.outcome === "success"
  return (
    <div className={styles.debrief}>
      <h1 className={ok ? styles.win : styles.lose}>
        {ok ? proc.texts.successTitle : proc.texts.failedTitle}
      </h1>
      <p>{ok ? proc.texts.successText : proc.texts.failedText}</p>
      <div className={styles.stars} aria-label={`${f.stars} von 3 Sternen`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={i < f.stars ? styles.starOn : styles.starOff}
          >
            ★
          </span>
        ))}
      </div>
      <ul className={styles.statline}>
        <li>
          {ui.score} <b>{state.score}</b>
          {best !== null && ok ? ` (BEST ${best})` : ""}
        </li>
        <li>
          {ui.rounds}{" "}
          <b>
            {state.round}/{proc.roundLimit}
          </b>
        </li>
        {stats.map((x) => (
          <li key={x.label}>
            {x.label} <b>{view[x.stat] ?? 0}</b>
          </li>
        ))}
      </ul>
      {state.unlocked.length > 0 && (
        <>
          <h3>{ui.runAchievements}</h3>
          <ul className={styles.achRow}>
            {state.unlocked.map((id) => {
              const a = proc.achievements.find((x) => x.id === id)!
              return (
                <li key={id} title={a.description}>
                  <span>{a.icon}</span> {a.title}
                </li>
              )
            })}
          </ul>
        </>
      )}
      <h3>{ui.decisions}</h3>
      <ol className={styles.log}>
        {state.log.map((l, i) => (
          <li key={i} className={l.score >= 0 ? styles.logGood : styles.logBad}>
            <div className={styles.logHead}>
              <span>
                {l.stageTitle} · {l.npcName}
              </span>
              <b>
                {l.score > 0 ? "+" : ""}
                {l.score}
              </b>
            </div>
            <div>„{l.choiceText}“</div>
            {l.learn && <div className={styles.logLearn}>{l.learn}</div>}
          </li>
        ))}
      </ol>
      <button className={styles.ghostBtn} onClick={onShowAchievements}>
        🏆 {ui.allAchievements}
      </button>
      <button className={styles.startBtn} onClick={onRestart}>
        {ui.restart}
      </button>
    </div>
  )
}
