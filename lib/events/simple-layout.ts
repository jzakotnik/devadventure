import type { AgentId } from "./types"

export const AGENT_POSITION: Record<AgentId, { x: number; y: number }> = {
  PM: { x: 50, y: 50 },
  BMZ: { x: 50, y: 13 },
  PEA: { x: 15, y: 82 },
  TEAMLEITUNG: { x: 85, y: 82 },
}

export const SATELLITE_AGENTS: AgentId[] = ["BMZ", "PEA", "TEAMLEITUNG"]
