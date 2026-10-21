"use client"

import { useEffect, useState } from "react"
import type { DialogView } from "../_game/engine"
import type { NpcLook, UiTexts } from "../_game/schema"
import styles from "../game.module.css"
import { Portrait } from "./Portrait"

interface Props {
  dialog: DialogView
  npc: { name: string; title: string; look: NpcLook }
  onChoose: (index: number) => void
  onAdvance: () => void
  onBlip: (i: number) => void
  ui: Pick<UiTexts, "next" | "learnLabel">
}

export function DialogBox({
  dialog,
  npc,
  onChoose,
  onAdvance,
  onBlip,
  ui,
}: Props) {
  const key = `${dialog.npcId}|${dialog.nodeId}|${dialog.phase}|${dialog.pickedIndex}|${dialog.text}`
  return (
    <DialogInner
      key={key}
      dialog={dialog}
      npc={npc}
      onChoose={onChoose}
      onAdvance={onAdvance}
      onBlip={onBlip}
      ui={ui}
    />
  )
}

function DialogInner({ dialog, npc, onChoose, onAdvance, onBlip, ui }: Props) {
  const [shown, setShown] = useState(0)
  const [hi, setHi] = useState(0)
  const full = shown >= dialog.text.length

  useEffect(() => {
    if (full) return
    const t = setInterval(() => {
      setShown((n) => {
        if (n % 2 === 0) onBlip(n)
        return n + 1
      })
    }, 18)
    return () => clearInterval(t)
  }, [full, onBlip])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (["ArrowUp", "ArrowDown", " ", "Enter"].includes(k)) e.preventDefault()
      if (!full) {
        if (k === " " || k === "Enter" || k === "e" || k === "E")
          setShown(dialog.text.length)
        return
      }
      if (dialog.phase === "ask") {
        const n = dialog.choices.length
        if (k === "ArrowUp" || k === "w" || k === "W")
          setHi((h) => (h + n - 1) % n)
        else if (k === "ArrowDown" || k === "s" || k === "S")
          setHi((h) => (h + 1) % n)
        else if (k === "Enter" || k === " ") onChoose(hi)
        else if (/^[1-9]$/.test(k) && Number(k) <= n) onChoose(Number(k) - 1)
      } else if (k === "Enter" || k === " " || k === "e" || k === "E") {
        onAdvance()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [full, hi, dialog, onChoose, onAdvance])

  return (
    <div
      className={styles.dialog}
      onClick={() => !full && setShown(dialog.text.length)}
    >
      <div className={styles.dialogHead}>
        <Portrait look={npc.look} className={styles.portrait} />
        <div>
          <div className={styles.npcName}>{npc.name}</div>
          <div className={styles.npcTitle}>{npc.title}</div>
        </div>
      </div>
      <p className={styles.dialogText}>{dialog.text.slice(0, shown)}</p>
      {full && dialog.phase === "reply" && dialog.learn && (
        <div className={styles.learn}>
          <b>{ui.learnLabel}</b> {dialog.learn}
        </div>
      )}
      {full && dialog.phase === "ask" && (
        <ol className={styles.choices}>
          {dialog.choices.map((c, i) => (
            <li key={i}>
              <button
                className={
                  i === hi
                    ? `${styles.choice} ${styles.choiceActive}`
                    : styles.choice
                }
                onMouseEnter={() => setHi(i)}
                onClick={(e) => {
                  e.stopPropagation()
                  onChoose(i)
                }}
              >
                <span className={styles.choiceNo}>{i + 1}</span>
                {c.text}
              </button>
            </li>
          ))}
        </ol>
      )}
      {full && dialog.phase !== "ask" && (
        <button
          className={styles.more}
          onClick={(e) => {
            e.stopPropagation()
            onAdvance()
          }}
        >
          {ui.next}
        </button>
      )}
    </div>
  )
}
