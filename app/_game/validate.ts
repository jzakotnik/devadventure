import type { AchievementRule, Process } from "./schema"
import { checkGameFile } from "./guard"
import { buildMap } from "./map"

/** Returns a list of human-readable problems; empty when the process is valid. */
export function validateProcess(proc: Process): string[] {
  // strict structure first: later checks assume well-formed data
  const malformed = checkGameFile(proc)
  if (malformed.length) return malformed
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

  const conds: Array<[string, AchievementRule]> = []
  for (const s of proc.stages) {
    if (!roomIds.has(s.room))
      errors.push(`stage ${s.id}: unknown room ${s.room}`)
    if (!proc.npcs[s.npc]) errors.push(`stage ${s.id}: unknown npc ${s.npc}`)
    for (const d of [s.dialog, s.repeatDialog]) {
      if (d && !proc.dialogs[d])
        errors.push(`stage ${s.id}: unknown dialog ${d}`)
    }
    for (const [result, entry] of Object.entries(s.on)) {
      const effs = Array.isArray(entry) ? entry : [entry]
      if (Array.isArray(entry) && !entry.length)
        errors.push(`stage ${s.id}.on.${result}: empty effect list`)
      effs.forEach((eff, i) => {
        if (eff.next && !stageIds.has(eff.next))
          errors.push(`stage ${s.id}.on.${result}: unknown stage ${eff.next}`)
        if (eff.when) conds.push([`stage ${s.id}.on.${result}[${i}]`, eff.when])
      })
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

  // every result a stage's dialogs can emit must be handled by that stage
  for (const s of proc.stages) {
    const seen = new Set<string>()
    const walk = (id: string | undefined) => {
      if (!id || seen.has(id) || !proc.dialogs[id]) return
      seen.add(id)
      const node = proc.dialogs[id]
      if (node.result && !s.on[node.result])
        errors.push(
          `stage ${s.id}: dialog ${id} result ${node.result} not in "on"`
        )
      walk(node.next)
      for (const c of node.choices ?? []) {
        if (c.result && !s.on[c.result])
          errors.push(
            `stage ${s.id}: dialog ${id} result ${c.result} not in "on"`
          )
        walk(c.goto)
      }
    }
    walk(s.dialog)
    walk(s.repeatDialog)
  }

  for (const step of proc.pipeline) {
    for (const sid of step.stages)
      if (!stageIds.has(sid))
        errors.push(`pipeline ${step.label}: unknown stage ${sid}`)
  }

  for (const w of proc.ambient.wanderers) {
    if (map.isSolid(w.start[0], w.start[1]))
      errors.push(`wanderer ${w.id}: start ${w.start} is not walkable`)
  }
  if (proc.ambient.wanderers.length && !proc.ambient.lines.length)
    errors.push("ambient: no greeting lines")

  const flags = new Set<string>()
  for (const node of Object.values(proc.dialogs))
    for (const c of node.choices ?? []) if (c.flag) flags.add(c.flag)
  for (const ev of proc.events) {
    for (const c of ev.choices) if (c.flag) flags.add(c.flag)
    if (ev.choices.length < 1 || ev.choices.length > 4)
      errors.push(`event ${ev.id}: needs 1-4 choices`)
    for (const sid of ev.stages ?? [])
      if (!stageIds.has(sid))
        errors.push(`event ${ev.id}: unknown stage ${sid}`)
  }
  for (const [where, rule] of conds)
    if (rule.flag && !flags.has(rule.flag))
      errors.push(`${where}: flag ${rule.flag} is never set`)
  const { minSteps, maxSteps } = proc.eventSettings
  if (minSteps > maxSteps) errors.push("eventSettings: minSteps > maxSteps")

  const ids = new Set<string>()
  for (const a of proc.achievements) {
    if (ids.has(a.id)) errors.push(`achievement ${a.id}: duplicate id`)
    ids.add(a.id)
    if (a.rule.flag && !flags.has(a.rule.flag))
      errors.push(`achievement ${a.id}: flag ${a.rule.flag} is never set`)
    if (a.rule.roomsVisited && a.rule.roomsVisited > proc.rooms.length)
      errors.push(`achievement ${a.id}: more rooms than exist`)
  }
  return errors
}
