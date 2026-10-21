"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sound } from "../_game/audio"
import {
  addSteps,
  advance,
  choose,
  createState,
  enterRoom,
  pickEvent,
  stageOf,
  uiOf,
  startEvent,
  startTalk,
  type GameState,
} from "../_game/engine"
import { TILE } from "../_game/map"
import { Renderer, SCALE, VIEW_H, VIEW_W } from "../_game/render"
import type { Dir, Process } from "../_game/schema"
import { World } from "../_game/world"
import styles from "../game.module.css"
import { DialogBox } from "./DialogBox"
import { Achievements } from "./Achievements"
import { Debrief } from "./Debrief"

function banners0(fresh: Array<{ seq: number; id: string }>, known: string[]) {
  return fresh.map((f) => ({
    key: f.seq + Date.now(),
    id: f.id,
    isNew: !known.includes(f.id),
  }))
}

type Mode = "title" | "play" | "end"

const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
}

export function GameClient({ proc }: { proc: Process }) {
  const ui = uiOf(proc)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const soundRef = useRef<Sound | null>(null)
  const [mode, setMode] = useState<Mode>("title")
  const [state, setState] = useState<GameState>(() => createState(proc))
  const [muted, setMuted] = useState(false)
  const [toast, setToast] = useState<GameState["toast"]>(null)
  const [best, setBest] = useState<number | null>(null)
  const stateRef = useRef(state)
  const modeRef = useRef(mode)
  const prevRef = useRef(state)
  const closedAt = useRef(0)
  const showAchRef = useRef(false)
  const stepsRef = useRef(0)
  const sinceEventRef = useRef(0)
  const nextEventRef = useRef(0)
  const lastRoomRef = useRef<string | null>(null)
  const lastFlushRef = useRef(0)
  const feedSeenRef = useRef(0)
  const [allUnlocked, setAllUnlocked] = useState<string[]>([])
  const [banners, setBanners] = useState<
    Array<{ key: number; id: string; isNew: boolean }>
  >([])
  const [showAch, setShowAch] = useState(false)
  const allUnlockedRef = useRef<string[]>([])

  useEffect(() => {
    stateRef.current = state
    modeRef.current = mode
    showAchRef.current = showAch
  })

  const update = useCallback((fn: (s: GameState) => GameState) => {
    const next = fn(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  // load persisted achievements
  useEffect(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem(`bueroquest:ach:${proc.id}`) ?? "[]"
      )
      if (Array.isArray(v)) {
        allUnlockedRef.current = v
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAllUnlocked(v)
      }
    } catch {}
  }, [])

  // load best score
  useEffect(() => {
    try {
      const v = localStorage.getItem(`bueroquest:best:${proc.id}`)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v) setBest(Number(v))
    } catch {}
  }, [])

  // game loop
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const world = new World(proc)
    const sound = new Sound()
    worldRef.current = world
    soundRef.current = sound
    const resetEventTimer = () => {
      const { minSteps, maxSteps } = proc.eventSettings
      sinceEventRef.current = 0
      nextEventRef.current =
        minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1))
    }
    resetEventTimer()
    world.onStep = () => {
      sound.stepSfx()
      stepsRef.current++
      sinceEventRef.current++
    }
    world.onDoor = () => sound.door()
    world.onGreet = () => sound.blip(2)
    const renderer = new Renderer(proc, world)
    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = stateRef.current
      const playing = modeRef.current === "play"
      const talk = world.update(dt, !playing || !!s.dialog || !!s.finished)
      if (playing && !s.finished) {
        const room = world.map.roomAt(world.x, world.y)
        if (room && room !== lastRoomRef.current) {
          lastRoomRef.current = room
          update((cur) => enterRoom(proc, cur, room))
        }
        if (stepsRef.current > 0 && now - lastFlushRef.current > 1000) {
          lastFlushRef.current = now
          const n = stepsRef.current
          stepsRef.current = 0
          update((cur) => addSteps(proc, cur, n))
        }
        if (
          !s.dialog &&
          !world.moving &&
          sinceEventRef.current >= nextEventRef.current
        ) {
          const id = pickEvent(proc, s, Math.random())
          resetEventTimer()
          if (id) {
            world.held = []
            world.path = []
            world.pendingTalk = null
            world.addPopup("!", "#ffd866")
            sound.alert()
            update((cur) => startEvent(proc, cur, id))
          }
        }
      }
      if (talk) {
        sound.talk()
        update((cur) => startTalk(proc, cur, talk))
      }
      const stage = stageOf(proc, s)
      renderer.draw(ctx, {
        targetNpc: playing && !s.dialog && !s.finished ? stage.npc : null,
        nearNpc:
          playing && !s.dialog && !s.finished ? world.adjacentNpc() : null,
        talkingNpc: s.dialog?.npcId ?? null,
        showPlayer: true,
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      sound.stopMusic()
    }
  }, [update])

  // reactions to state changes: popups and sounds
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = state
    if (prev.dialog && !state.dialog) closedAt.current = performance.now()
    const world = worldRef.current
    const sound = soundRef.current
    if (!world || !sound || state === prev) return
    if (state.score !== prev.score) {
      const d = state.score - prev.score
      world.addPopup(`${d > 0 ? "+" : ""}${d}`, d > 0 ? "#7aff9a" : "#ff7a7a")
      if (d > 0) sound.select()
    }
    if (state.toast && state.toast.id !== prev.toast?.id) {
      if (state.toast.tone === "good") sound.good()
      else if (state.toast.tone === "bad") sound.bad()
    }
    if (state.finished && !prev.finished) {
      if (state.finished.outcome === "success") sound.fanfare()
      else sound.fail()
    }
  }, [state])

  // achievement announcements + persistence
  const feedLen = state.unlockFeed.length
  useEffect(() => {
    if (feedLen < feedSeenRef.current) feedSeenRef.current = 0
    const fresh = stateRef.current.unlockFeed.slice(feedSeenRef.current)
    feedSeenRef.current = feedLen
    if (!fresh.length) return
    const known = allUnlockedRef.current
    const added = banners0(fresh, known)
    soundRef.current?.achievement()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBanners((b) => [...b, ...added])
    const merged = Array.from(new Set([...known, ...fresh.map((f) => f.id)]))
    allUnlockedRef.current = merged
    setAllUnlocked(merged)
    try {
      localStorage.setItem(`bueroquest:ach:${proc.id}`, JSON.stringify(merged))
    } catch {}
    const keys = added.map((a) => a.key)
    const t = setTimeout(
      () => setBanners((b) => b.filter((x) => !keys.includes(x.key))),
      4500
    )
    return () => clearTimeout(t)
  }, [feedLen])

  // toast lifetime
  const toastId = state.toast?.id
  useEffect(() => {
    if (!state.toast) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast(state.toast)
    const t = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId])

  // ending: show debrief after a short beat
  const finished = state.finished
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(() => {
      setMode("end")
      try {
        const k = `bueroquest:best:${proc.id}`
        const old = Number(localStorage.getItem(k) ?? "0")
        if (finished.outcome === "success" && stateRef.current.score > old) {
          localStorage.setItem(k, String(stateRef.current.score))
          setBest(stateRef.current.score)
        }
      } catch {}
    }, 1500)
    return () => clearTimeout(t)
  }, [finished])

  const start = useCallback(() => {
    const sound = soundRef.current!
    sound.unlock()
    sound.talk()
    sound.startMusic()
    worldRef.current?.reset()
    stepsRef.current = 0
    sinceEventRef.current = 0
    lastRoomRef.current = null
    feedSeenRef.current = 0
    setBanners([])
    update(() => createState(proc))
    prevRef.current = stateRef.current
    setToast(null)
    setMode("play")
  }, [update])

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat && !KEYS[e.key]) return
      const m = modeRef.current
      const s = stateRef.current
      if (e.key === "m" || e.key === "M") {
        const next = !soundRef.current!.muted
        soundRef.current!.setMuted(next)
        setMuted(next)
        return
      }
      if (showAchRef.current) {
        if (e.key === "Escape") setShowAch(false)
        return
      }
      if (m === "title") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          start()
        }
        return
      }
      if (m !== "play" || s.dialog || s.finished) return
      if (performance.now() - closedAt.current < 400) return
      const dir = KEYS[e.key]
      if (dir) {
        e.preventDefault()
        worldRef.current?.press(dir)
      } else if (
        e.key === "e" ||
        e.key === "E" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault()
        const npc = worldRef.current?.adjacentNpc()
        if (npc) {
          worldRef.current!.faceToward(
            proc.npcs[npc].at[0],
            proc.npcs[npc].at[1]
          )
          soundRef.current?.talk()
          update((cur) => startTalk(proc, cur, npc))
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      const dir = KEYS[e.key]
      if (dir) worldRef.current?.release(dir)
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [start, update])

  const tileAt = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [
      Math.floor(((e.clientX - r.left) / r.width) * (VIEW_W / TILE)),
      Math.floor(((e.clientY - r.top) / r.height) * (VIEW_H / TILE)),
    ]
  }

  const onChoose = useCallback(
    (i: number) => {
      soundRef.current?.select()
      update((s) => choose(proc, s, i))
    },
    [update]
  )
  const onAdvance = useCallback(() => {
    soundRef.current?.select()
    update((s) => advance(proc, s))
  }, [update])
  const onBlip = useCallback((i: number) => soundRef.current?.blip(i), [])

  const stage = stageOf(proc, state)
  const dialogNpc = state.dialog
    ? (state.dialog.speaker ?? proc.npcs[state.dialog.npcId])
    : null
  const currentStep = proc.pipeline.findIndex((p) =>
    p.stages.includes(state.stageId)
  )

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          width={VIEW_W * SCALE}
          height={VIEW_H * SCALE}
          className={styles.canvas}
          onClick={(e) => {
            if (mode !== "play" || state.dialog || state.finished) return
            const [tx, ty] = tileAt(e)
            worldRef.current?.clickTile(tx, ty)
          }}
          onMouseMove={(e) => {
            if (worldRef.current) worldRef.current.hover = tileAt(e)
          }}
          onMouseLeave={() => {
            if (worldRef.current) worldRef.current.hover = null
          }}
        />
        <div className={styles.scanlines} />

        {mode === "play" && (
          <>
            <div className={styles.hudLeft}>
              <ol className={styles.pipeline}>
                {proc.pipeline.map((p, i) => (
                  <li
                    key={p.label}
                    className={
                      i < currentStep || state.finished?.outcome === "success"
                        ? styles.done
                        : i === currentStep
                          ? styles.active
                          : ""
                    }
                  >
                    {p.label}
                  </li>
                ))}
              </ol>
              <div className={styles.objective}>
                <b>{ui.objective}</b> {stage.objective}
              </div>
            </div>
            <div className={styles.hudRight}>
              <div>
                {ui.score} <b>{state.score}</b>
              </div>
              <div>
                {ui.rounds}{" "}
                <b
                  className={
                    state.round >= proc.roundLimit ? styles.danger : ""
                  }
                >
                  {state.round}/{proc.roundLimit}
                </b>
              </div>
              <div>
                {ui.achievements}{" "}
                <b>
                  {state.unlocked.length}/{proc.achievements.length}
                </b>
              </div>
              {ui.document && (
                <div>
                  {ui.document}{" "}
                  <b>{state.hasDoc ? `v${state.docVersion}` : "–"}</b>
                </div>
              )}
              <button
                className={styles.mute}
                onClick={() => {
                  const next = !soundRef.current!.muted
                  soundRef.current!.setMuted(next)
                  setMuted(next)
                }}
              >
                {muted ? ui.muteOff : ui.muteOn} [M]
              </button>
            </div>
            <div className={styles.banners}>
              {banners.map((b) => {
                const a = proc.achievements.find((x) => x.id === b.id)!
                return (
                  <div key={b.key} className={styles.banner}>
                    <span className={styles.bannerIcon}>{a.icon}</span>
                    <div>
                      <div className={styles.bannerHead}>
                        {ui.unlockedHead}
                        {b.isNew ? " · NEU!" : ""}
                      </div>
                      <b>{a.title}</b>
                      <div className={styles.bannerDesc}>{a.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {toast && (
              <div
                key={toast.id}
                className={`${styles.toast} ${styles[toast.tone]}`}
              >
                {toast.text}
              </div>
            )}
            {state.dialog && dialogNpc && (
              <DialogBox
                dialog={state.dialog}
                npc={dialogNpc}
                onChoose={onChoose}
                onAdvance={onAdvance}
                onBlip={onBlip}
                ui={ui}
              />
            )}
            {!state.dialog && state.round === 0 && state.log.length === 0 && (
              <div className={styles.help}>{ui.hintHelp}</div>
            )}
          </>
        )}

        {mode === "title" && (
          <div className={styles.title}>
            <h1 className={styles.logo}>{proc.title}</h1>
            <h2>{proc.subtitle}</h2>
            <div className={styles.intro}>
              {proc.intro.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
            <button
              className={styles.ghostBtn}
              onClick={() => setShowAch(true)}
            >
              🏆 {ui.achievements} {allUnlocked.length}/
              {proc.achievements.length}
            </button>
            <button className={styles.startBtn} onClick={start}>
              {ui.start}
            </button>
            <p className={styles.keys}>{ui.titleKeys}</p>
            {best !== null && (
              <p className={styles.keys}>
                {ui.bestScore.replace("{n}", String(best))}
              </p>
            )}
          </div>
        )}

        {mode === "end" && state.finished && (
          <Debrief
            proc={proc}
            state={state}
            best={best}
            onRestart={start}
            onShowAchievements={() => setShowAch(true)}
          />
        )}

        {showAch && (
          <Achievements
            proc={proc}
            unlocked={allUnlocked}
            thisRun={mode === "end" ? state.unlocked : []}
            onClose={() => setShowAch(false)}
          />
        )}
      </div>
    </main>
  )
}
