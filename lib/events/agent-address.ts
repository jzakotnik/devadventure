import type { AgentId } from "./types"

/** Mirrors the `directory` map in the PM n8n workflow. */
const ADDRESS_TO_AGENT: Record<string, AgentId> = {
  "projektmanager@youhadonejob.de": "PM",
  "bmz@youhadonejob.de": "BMZ",
  "pea@youhadonejob.de": "PEA",
  "teamleitung@youhadonejob.de": "TEAMLEITUNG",
}

export function addressToAgent(address?: string): AgentId | undefined {
  if (!address) return undefined
  return ADDRESS_TO_AGENT[address.trim().toLowerCase()]
}

/** BMZ/PEA/Teamleitung only ever correspond with PM, so that's a safe fallback. */
export function guessCounterpart(event: { agent: AgentId; email?: { from?: string; to?: string } }, direction: "from" | "to"): AgentId {
  const address = direction === "from" ? event.email?.from : event.email?.to
  return addressToAgent(address) ?? (event.agent === "PM" ? "PM" : "PM")
}
