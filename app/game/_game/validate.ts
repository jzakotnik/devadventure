import type { Process } from "./schema"
import { buildMap } from "./map"

/** Returns a list of human-readable problems; empty when the process is valid. */
export function validateProcess(proc: Process): string[] {
  const errors: string[] = []
  const roomIds = new Set(proc.rooms.map((r) => r.id))
  const stageIds = new Set(proc.stages.map((s) => s.id))
  const map = buildMap(proc)

  proc.map.layout.forEach((row, y) => {
    if (row.length !== map.w)
      errors.push(`map row ${y} has width ${row.length}, expected ${map.w}`)
  })
  const [sx, sy] = proc.map.start
  if (map.isSolid(sx, sy))
    errors.push(`start position ${sx},${sy} is not walkable`)

  for (const [id, npc] of Object.entries(proc.npcs)) {
    if (!roomIds.has(npc.room))
      errors.push(`npc ${id}: unknown room ${npc.room}`)
    if (map.isSolid(npc.at[0], npc.at[1]))
      errors.push(`npc ${id}: position ${npc.at} is not walkable`)
    if (map.roomAt(npc.at[0], npc.at[1]) !== npc.room)
      errors.push(`npc ${id}: not inside room ${npc.room}`)
  }

  if (!stageIds.has(proc.firstStage))
    errors.push(`unknown firstStage ${proc.firstStage}`)

  for (const s of proc.stages) {
    if (!roomIds.has(s.room))
      errors.push(`stage ${s.id}: unknown room ${s.room}`)
    if (!proc.npcs[s.npc]) errors.push(`stage ${s.id}: unknown npc ${s.npc}`)
    for (const d of [s.dialog, s.repeatDialog]) {
      if (d && !proc.dialogs[d])
        errors.push(`stage ${s.id}: unknown dialog ${d}`)
    }
    for (const [result, eff] of Object.entries(s.on)) {
      if (eff.next && !stageIds.has(eff.next))
        errors.push(`stage ${s.id}.on.${result}: unknown stage ${eff.next}`)
    }
  }

  for (const [id, node] of Object.entries(proc.dialogs)) {
    if (node.next && !proc.dialogs[node.next])
      errors.push(`dialog ${id}: unknown next ${node.next}`)
    if (node.choices && node.choices.length > 4)
      errors.push(`dialog ${id}: more than 4 choices`)
    for (const c of node.choices ?? []) {
      if (c.goto && !proc.dialogs[c.goto])
        errors.push(`dialog ${id}: unknown goto ${c.goto}`)
    }
  }

  for (const step of proc.pipeline) {
    for (const sid of step.stages)
      if (!stageIds.has(sid))
        errors.push(`pipeline ${step.label}: unknown stage ${sid}`)
  }
  return errors
}
