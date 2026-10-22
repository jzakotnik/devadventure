/**
 * Types for a game process definition (see ../_content/*.json).
 * The game code uses relative imports only and has no backend, so it can
 * be moved to its own repo without changes.
 */

export type Dir = "up" | "down" | "left" | "right"

export interface Room {
  id: string
  label: string
  /** Base floor colour (hex). */
  color: string
  /** [x, y, w, h] in tiles. */
  rect: [number, number, number, number]
}

export interface NpcLook {
  shirt: string
  pants: string
  hair: string
  skin: string
  accessory?: "glasses" | "tie" | "bow" | "cap"
}

export interface Npc {
  id: string
  name: string
  title: string
  room: string
  at: [number, number]
  facing?: Dir
  look: NpcLook
  /** "hint": gives the stage hint (costs points). "fact": gives a process fact (bonus). */
  role?: "hint" | "fact"
}

export interface Choice {
  text: string
  /** NPC reaction shown after the pick. */
  reply?: string
  /** "Why does it work like this?" card shown after the pick. */
  learn?: string
  score?: number
  /** Key into the current stage's `on` map. */
  result?: string
  /** Continue with another dialog node. */
  goto?: string
  /** Change of revision rounds (events). */
  round?: number
  /** Sets a flag (used by achievements). */
  flag?: string
}

export interface DialogNode {
  text: string
  choices?: Choice[]
  /** For nodes without choices: continue with another node... */
  next?: string
  /** ...or finish with a result. */
  result?: string
}

export interface Effect {
  /**
   * Condition (same fields as an achievement rule, all must hold). Only
   * meaningful when a result maps to a list of effects: the first effect
   * whose `when` holds (or has none) is applied.
   */
  when?: AchievementRule
  /** Next stage id. Omit to stay in the current stage. */
  next?: string
  costsRound?: boolean
  docVersion?: number
  giveDoc?: boolean
  score?: number
  ending?: "success" | "failed"
  /** Toast shown to the player. */
  message?: string
  tone?: "good" | "bad" | "info"
}

export interface Stage {
  id: string
  title: string
  room: string
  npc: string
  objective: string
  hint: string
  fact: string
  dialog: string
  /** Used instead of `dialog` when the stage is visited again. */
  repeatDialog?: string
  /** RESULT -> effect, or an ordered list of conditional effects. */
  on: Record<string, Effect | Effect[]>
}

export interface PipelineStep {
  label: string
  stages: string[]
}

export interface Process {
  id: string
  title: string
  subtitle: string
  intro: string[]
  /** Small print on the title screen, one entry per line (sources, fiction, liability). */
  disclaimer?: string[]
  roundLimit: number
  firstStage: string
  pipeline: PipelineStep[]
  /** Optional; missing fields fall back to DEFAULT_SCORING. */
  scoring?: Partial<Scoring>
  /** Optional; missing fields fall back to DEFAULT_UI. */
  ui?: Partial<UiTexts>
  /** Extra stat lines in the end screen (score and rounds are always shown). */
  debrief?: { stats: Array<{ label: string; stat: string }> }
  texts: {
    wrongNpc: string
    hintPrefix: string
    factPrefix: string
    successTitle: string
    successText: string
    failedTitle: string
    failedText: string
  }
  map: {
    /** One string per row; see MAP_LEGEND in map.ts. */
    layout: string[]
    start: [number, number]
  }
  rooms: Room[]
  npcs: Record<string, Omit<Npc, "id">>
  stages: Stage[]
  dialogs: Record<string, DialogNode>
  events: GameEvent[]
  eventSettings: EventSettings
  achievements: Achievement[]
  ambient: Ambient
}

/* ---------------------------------------------------------- random events */

export interface GameEvent {
  id: string
  title: string
  icon: string
  /** Who "speaks": shown in the dialog box. */
  speaker: { name: string; title: string; look: NpcLook }
  text: string
  choices: Choice[]
  /** Only in these stages (omit = any). */
  stages?: string[]
  requiresDoc?: boolean
  weight?: number
}

export interface EventSettings {
  /** Steps walked between events: random in [minSteps, maxSteps]. */
  minSteps: number
  maxSteps: number
  maxPerRun: number
}

/* ----------------------------------------------------------- achievements */

/** All given fields must hold (AND). Stats: see `statsView` in engine.ts. */
export interface AchievementRule {
  stat?: string
  gte?: number
  statAtMost?: Record<string, number>
  finished?: "success" | "failed"
  roundsAtMost?: number
  roundsAtLeast?: number
  scoreAtLeast?: number
  scoreAtMost?: number
  flag?: string
  roomsVisited?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rule: AchievementRule
}

/* ---------------------------------------------------------- ambient life */

export interface Wanderer {
  id: string
  name: string
  start: [number, number]
  look: NpcLook
}

/** Colleagues walking around who greet you in passing (never block or interrupt). */
export interface Ambient {
  /** In tiles. */
  greetDistance: number
  /** Seconds before the same colleague greets again. */
  cooldownSec: number
  bubbleSec: number
  lines: string[]
  wanderers: Wanderer[]
}

/* ------------------------------------------------------- scoring and texts */

export interface Scoring {
  /** Points deducted when asking a hint NPC. */
  hintCost: number
  /** Points for the first fact per stage. */
  factBonus: number
  /** First entry with rounds <= roundsAtMost wins; otherwise 1 star. */
  stars: Array<{ roundsAtMost: number; stars: number }>
}

export const DEFAULT_SCORING: Scoring = {
  hintCost: 2,
  factBonus: 3,
  stars: [
    { roundsAtMost: 0, stars: 3 },
    { roundsAtMost: 1, stars: 2 },
  ],
}

/** UI strings. `{n}` placeholders are replaced by the engine. */
export interface UiTexts {
  objective: string
  score: string
  rounds: string
  achievements: string
  /** Label of the HUD slot for the process document; empty string hides it. */
  document: string
  muteOn: string
  muteOff: string
  next: string
  start: string
  restart: string
  bestScore: string
  hintHelp: string
  titleKeys: string
  factBonus: string
  learnLabel: string
  unlockedHead: string
  decisions: string
  runAchievements: string
  allAchievements: string
  back: string
  loadError: string
  menu: string
  disclaimerLabel: string
}

export const DEFAULT_UI: UiTexts = {
  objective: "ZIEL",
  score: "PUNKTE",
  rounds: "RUNDEN",
  achievements: "ERFOLGE",
  document: "DOKUMENT",
  muteOn: "TON AN",
  muteOff: "TON AUS",
  next: "Weiter ▶",
  start: "▶ ENTER = START",
  restart: "▶ NOCHMAL SPIELEN",
  bestScore: "BESTER SCORE: {n}",
  hintHelp: "PFEILTASTEN / WASD: LAUFEN · E: SPRECHEN · MAUSKLICK: HINLAUFEN",
  titleKeys:
    "Pfeiltasten / WASD laufen · E oder Klick sprechen · 1–3 antworten · M Ton",
  factBonus: " (+{n} Punkte)",
  learnLabel: "Warum so?",
  unlockedHead: "ERFOLG FREIGESCHALTET",
  decisions: "Deine Entscheidungen",
  runAchievements: "Erfolge in dieser Runde",
  allAchievements: "ALLE ERFOLGE",
  back: "ZURÜCK [ESC]",
  loadError: "Das Spiel konnte nicht geladen werden",
  menu: "← MENÜ",
  disclaimerLabel: "Hinweis",
}
