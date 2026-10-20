/**
 * Types for a game process definition (see ../_content/*.json).
 * The whole /game folder is self-contained (relative imports only) so it can
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
  on: Record<string, Effect>
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
  roundLimit: number
  firstStage: string
  pipeline: PipelineStep[]
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
}
