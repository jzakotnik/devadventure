import type { AchievementRule, Choice, NpcLook, Process, Stage } from "./schema"

/** Pure, immutable process state machine. No DOM, no React. */

export interface DialogView {
  npcId: string
  nodeId: string | null
  text: string
  choices: Choice[]
  /** say: read + continue, ask: pick a choice, reply: NPC reaction + learn card. */
  phase: "say" | "ask" | "reply"
  pickedIndex: number | null
  learn: string | null
  /** Set for random-event dialogs. */
  eventId: string | null
  speaker: { name: string; title: string; look: NpcLook } | null
}

export interface LogEntry {
  stageId: string
  stageTitle: string
  npcName: string
  question: string
  choiceText: string
  result: string | null
  score: number
  learn: string | null
  round: number
}

export interface Toast {
  id: number
  text: string
  tone: "good" | "bad" | "info"
}

export interface GameState {
  stageId: string
  round: number
  score: number
  docVersion: number
  hasDoc: boolean
  visits: Record<string, number>
  wrongVisits: number
  hintsUsed: number
  factsSeen: string[]
  dialog: DialogView | null
  toast: Toast | null
  log: LogEntry[]
  stats: Record<string, number>
  flags: string[]
  visitedRooms: string[]
  eventsSeen: string[]
  /** Achievements unlocked in this run. */
  unlocked: string[]
  /** Append-only feed so the UI can announce new unlocks. */
  unlockFeed: Array<{ seq: number; id: string }>
  finished: null | { outcome: "success" | "failed"; stars: number }
}

export function createState(proc: Process): GameState {
  return {
    stageId: proc.firstStage,
    round: 0,
    score: 0,
    docVersion: 0,
    hasDoc: false,
    visits: {},
    wrongVisits: 0,
    hintsUsed: 0,
    factsSeen: [],
    dialog: null,
    toast: null,
    log: [],
    stats: {},
    flags: [],
    visitedRooms: [],
    eventsSeen: [],
    unlocked: [],
    unlockFeed: [],
    finished: null,
  }
}

export function stageOf(proc: Process, s: GameState): Stage {
  return proc.stages.find((st) => st.id === s.stageId)!
}

function say(npcId: string, text: string): DialogView {
  return {
    npcId,
    nodeId: null,
    text,
    choices: [],
    phase: "say",
    pickedIndex: null,
    learn: null,
    eventId: null,
    speaker: null,
  }
}

function openNode(proc: Process, npcId: string, nodeId: string): DialogView {
  const node = proc.dialogs[nodeId]
  return {
    npcId,
    nodeId,
    text: node.text,
    choices: node.choices ?? [],
    phase: node.choices?.length ? "ask" : "say",
    pickedIndex: null,
    learn: null,
    eventId: null,
    speaker: null,
  }
}

function startTalkRaw(proc: Process, s: GameState, npcId: string): GameState {
  if (s.dialog || s.finished) return s
  const stage = stageOf(proc, s)
  const npc = proc.npcs[npcId]
  if (!npc) return s

  if (npcId === stage.npc) {
    const repeat = (s.visits[stage.id] ?? 0) > 0 && stage.repeatDialog
    return {
      ...s,
      visits: { ...s.visits, [stage.id]: (s.visits[stage.id] ?? 0) + 1 },
      dialog: openNode(
        proc,
        npcId,
        repeat ? stage.repeatDialog! : stage.dialog
      ),
    }
  }
  if (npc.role === "hint") {
    return {
      ...s,
      score: s.score - 2,
      hintsUsed: s.hintsUsed + 1,
      dialog: say(npcId, proc.texts.hintPrefix + stage.hint),
    }
  }
  if (npc.role === "fact") {
    const first = !s.factsSeen.includes(stage.id)
    return {
      ...s,
      score: s.score + (first ? 3 : 0),
      factsSeen: first ? [...s.factsSeen, stage.id] : s.factsSeen,
      dialog: say(
        npcId,
        proc.texts.factPrefix + stage.fact + (first ? " (+3 Punkte)" : "")
      ),
    }
  }
  const target =
    proc.rooms.find((r) => r.id === stage.room)?.label ?? stage.room
  return {
    ...s,
    wrongVisits: s.wrongVisits + 1,
    dialog: say(npcId, proc.texts.wrongNpc.replace("{room}", target)),
  }
}

function chooseRaw(proc: Process, s: GameState, index: number): GameState {
  const d = s.dialog
  if (!d || d.phase !== "ask") return s
  const choice = d.choices[index]
  if (!choice) return s
  const stage = stageOf(proc, s)
  const ev = d.eventId ? proc.events.find((e) => e.id === d.eventId) : null
  const entry: LogEntry = {
    stageId: stage.id,
    stageTitle: ev ? `Ereignis: ${ev.title}` : stage.title,
    npcName: d.speaker?.name ?? proc.npcs[d.npcId].name,
    question: d.text,
    choiceText: choice.text,
    result: choice.result ?? null,
    score: choice.score ?? 0,
    learn: choice.learn ?? null,
    round: s.round,
  }
  const next: GameState = {
    ...s,
    score: s.score + (choice.score ?? 0),
    round: Math.max(0, s.round + (choice.round ?? 0)),
    flags:
      choice.flag && !s.flags.includes(choice.flag)
        ? [...s.flags, choice.flag]
        : s.flags,
    stats: d.eventId
      ? bump(s.stats, (choice.score ?? 0) > 0 ? "eventsGood" : "eventsBad")
      : s.stats,
    log: [...s.log, entry],
  }
  if (choice.reply || choice.learn) {
    return {
      ...next,
      dialog: {
        ...d,
        phase: "reply",
        pickedIndex: index,
        text: choice.reply ?? "",
        learn: choice.learn ?? null,
      },
    }
  }
  return finishChoice(
    proc,
    { ...next, dialog: { ...d, pickedIndex: index } },
    choice
  )
}

function finishChoice(proc: Process, s: GameState, choice: Choice): GameState {
  const d = s.dialog!
  if (d.eventId) return checkLimit(proc, { ...s, dialog: null })
  if (choice.goto) return { ...s, dialog: openNode(proc, d.npcId, choice.goto) }
  const node = d.nodeId ? proc.dialogs[d.nodeId] : null
  const result = choice.result ?? node?.result
  return applyResult(proc, { ...s, dialog: null }, result)
}

function advanceRaw(proc: Process, s: GameState): GameState {
  const d = s.dialog
  if (!d) return s
  const node = d.nodeId ? proc.dialogs[d.nodeId] : null
  if (d.phase === "say") {
    if (d.eventId) return { ...s, dialog: null }
    if (node?.next) return { ...s, dialog: openNode(proc, d.npcId, node.next) }
    return applyResult(proc, { ...s, dialog: null }, node?.result)
  }
  if (d.phase === "reply" && d.pickedIndex !== null) {
    return finishChoice(proc, s, d.choices[d.pickedIndex])
  }
  return s
}

function applyResult(
  proc: Process,
  s: GameState,
  result: string | undefined
): GameState {
  if (!result) return s
  const stage = stageOf(proc, s)
  const eff = stage.on[result]
  if (!eff) return s

  let out: GameState = {
    ...s,
    stageId: eff.next ?? s.stageId,
    round: s.round + (eff.costsRound ? 1 : 0),
    score: s.score + (eff.score ?? 0),
    docVersion: s.docVersion + (eff.docVersion ?? 0),
    hasDoc: s.hasDoc || !!eff.giveDoc,
    toast: eff.message
      ? {
          id: (s.toast?.id ?? 0) + 1,
          text: eff.message,
          tone: eff.tone ?? "info",
        }
      : s.toast,
  }
  if (eff.ending === "success") {
    const stars = out.round === 0 ? 3 : out.round <= 1 ? 2 : 1
    out = { ...out, finished: { outcome: "success", stars } }
  } else if (eff.ending === "failed" || out.round > proc.roundLimit) {
    out = { ...out, finished: { outcome: "failed", stars: 0 } }
  }
  return out
}

function bump(stats: Record<string, number>, key: string, by = 1) {
  return { ...stats, [key]: (stats[key] ?? 0) + by }
}

/** Ends the run when the revision limit is exceeded. */
function checkLimit(proc: Process, s: GameState): GameState {
  if (s.round > proc.roundLimit && !s.finished) {
    return { ...s, finished: { outcome: "failed", stars: 0 } }
  }
  return s
}

/* ------------------------------------------------------------------ events */

/** Picks an eligible, not yet seen random event (or null). `rng` in [0,1). */
export function pickEvent(
  proc: Process,
  s: GameState,
  rng: number
): string | null {
  const max = proc.eventSettings.maxPerRun
  if (s.eventsSeen.length >= max || s.dialog || s.finished) return null
  const pool = proc.events.filter(
    (e) =>
      !s.eventsSeen.includes(e.id) &&
      (!e.stages || e.stages.includes(s.stageId)) &&
      (!e.requiresDoc || s.hasDoc) &&
      s.stageId !== proc.firstStage
  )
  if (!pool.length) return null
  const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0)
  let r = rng * total
  for (const e of pool) {
    r -= e.weight ?? 1
    if (r < 0) return e.id
  }
  return pool[pool.length - 1].id
}

export function startEvent(
  proc: Process,
  s: GameState,
  eventId: string
): GameState {
  const ev = proc.events.find((e) => e.id === eventId)
  if (!ev || s.dialog || s.finished) return s
  return evaluate(proc, {
    ...s,
    eventsSeen: [...s.eventsSeen, ev.id],
    stats: bump(s.stats, "events"),
    dialog: {
      npcId: "",
      nodeId: null,
      text: ev.text,
      choices: ev.choices,
      phase: "ask",
      pickedIndex: null,
      learn: null,
      eventId: ev.id,
      speaker: ev.speaker,
    },
  })
}

/* ------------------------------------------------------------ achievements */

export function addSteps(proc: Process, s: GameState, n: number): GameState {
  if (n <= 0) return s
  return evaluate(proc, { ...s, stats: bump(s.stats, "steps", n) })
}

export function enterRoom(
  proc: Process,
  s: GameState,
  roomId: string
): GameState {
  if (s.visitedRooms.includes(roomId)) return s
  return evaluate(proc, { ...s, visitedRooms: [...s.visitedRooms, roomId] })
}

/** Flat numeric view of everything achievement rules can refer to. */
export function statsView(s: GameState): Record<string, number> {
  return {
    talks: 0,
    steps: 0,
    events: 0,
    eventsGood: 0,
    eventsBad: 0,
    ...s.stats,
    hints: s.hintsUsed,
    facts: s.factsSeen.length,
    wrongVisits: s.wrongVisits,
    rooms: s.visitedRooms.length,
  }
}

function ruleMet(rule: AchievementRule, s: GameState): boolean {
  const v = statsView(s)
  if (rule.stat !== undefined && (v[rule.stat] ?? 0) < (rule.gte ?? 1))
    return false
  for (const [k, max] of Object.entries(rule.statAtMost ?? {}))
    if ((v[k] ?? 0) > max) return false
  if (rule.finished && s.finished?.outcome !== rule.finished) return false
  if (rule.roundsAtMost !== undefined && s.round > rule.roundsAtMost)
    return false
  if (rule.roundsAtLeast !== undefined && s.round < rule.roundsAtLeast)
    return false
  if (rule.scoreAtLeast !== undefined && s.score < rule.scoreAtLeast)
    return false
  if (rule.flag && !s.flags.includes(rule.flag)) return false
  if (rule.roomsVisited !== undefined && v.rooms < rule.roomsVisited)
    return false
  return true
}

/** Unlocks every achievement whose rule is now satisfied. */
export function evaluate(proc: Process, s: GameState): GameState {
  const fresh = proc.achievements.filter(
    (a) => !s.unlocked.includes(a.id) && ruleMet(a.rule, s)
  )
  if (!fresh.length) return s
  let seq = s.unlockFeed.length
  return {
    ...s,
    unlocked: [...s.unlocked, ...fresh.map((a) => a.id)],
    unlockFeed: [
      ...s.unlockFeed,
      ...fresh.map((a) => ({ seq: seq++, id: a.id })),
    ],
  }
}

/* --------------------------------------------------------- public wrappers */

export function startTalk(
  proc: Process,
  s: GameState,
  npcId: string
): GameState {
  const out = startTalkRaw(proc, s, npcId)
  if (out === s) return s
  return evaluate(proc, { ...out, stats: bump(out.stats, "talks") })
}

export function choose(proc: Process, s: GameState, index: number): GameState {
  return evaluate(proc, chooseRaw(proc, s, index))
}

export function advance(proc: Process, s: GameState): GameState {
  return evaluate(proc, advanceRaw(proc, s))
}
