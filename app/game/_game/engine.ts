import type { Choice, Process, Stage } from "./schema"

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
  }
}

export function startTalk(
  proc: Process,
  s: GameState,
  npcId: string
): GameState {
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

export function choose(proc: Process, s: GameState, index: number): GameState {
  const d = s.dialog
  if (!d || d.phase !== "ask") return s
  const choice = d.choices[index]
  if (!choice) return s
  const stage = stageOf(proc, s)
  const entry: LogEntry = {
    stageId: stage.id,
    stageTitle: stage.title,
    npcName: proc.npcs[d.npcId].name,
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
  if (choice.goto) return { ...s, dialog: openNode(proc, d.npcId, choice.goto) }
  const node = d.nodeId ? proc.dialogs[d.nodeId] : null
  const result = choice.result ?? node?.result
  return applyResult(proc, { ...s, dialog: null }, result)
}

export function advance(proc: Process, s: GameState): GameState {
  const d = s.dialog
  if (!d) return s
  const node = d.nodeId ? proc.dialogs[d.nodeId] : null
  if (d.phase === "say") {
    if (node?.next) return { ...s, dialog: openNode(proc, d.npcId, node.next) }
    return applyResult(proc, { ...s, dialog: null }, node?.result)
  }
  if (d.phase === "reply" && node && d.pickedIndex !== null) {
    return finishChoice(proc, s, node.choices![d.pickedIndex])
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
