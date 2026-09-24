import type { AgentId, DemoEvent, DocumentChange } from "./types"

export type AgentStatus =
  | "idle"
  | "received"
  | "working"
  | "revising"
  | "sent"
  | "decided"
  | "done"
  | "error"

export const AGENTS: AgentId[] = ["PM", "BMZ", "PEA", "TEAMLEITUNG"]

const STATUS_BY_TYPE: Record<DemoEvent["type"], AgentStatus> = {
  "email.received": "received",
  "agent.started": "working",
  "document.revised": "revising",
  "review.decided": "decided",
  "email.sent": "sent",
  "run.completed": "done",
  "agent.error": "error",
}

export type AgentState = {
  agent: AgentId
  status: AgentStatus
  lastEvent?: DemoEvent
  workingSince?: string
}

export function deriveAgentStates(events: DemoEvent[]): Record<AgentId, AgentState> {
  const state: Record<AgentId, AgentState> = Object.fromEntries(
    AGENTS.map((a) => [a, { agent: a, status: "idle" as AgentStatus }])
  ) as Record<AgentId, AgentState>

  for (const event of events) {
    const current = state[event.agent]
    if (!current) continue
    const status = STATUS_BY_TYPE[event.type] ?? current.status
    state[event.agent] = {
      agent: event.agent,
      status,
      lastEvent: event,
      workingSince: status === "working" ? event.occurred_at : undefined,
    }
  }

  return state
}

export type DocumentVersion = {
  version: number
  agent: AgentId
  markdown: string
  filename: string
  occurredAt: string
  changes?: DocumentChange[]
  summary?: string
}

export function deriveDocumentVersions(events: DemoEvent[]): DocumentVersion[] {
  const versions: DocumentVersion[] = []
  for (const event of events) {
    if (event.type !== "document.revised" || !event.document?.markdown) continue
    const version = event.document.version ?? versions.length + 1
    versions.push({
      version,
      agent: event.agent,
      markdown: event.document.markdown,
      filename: event.document.filename ?? "kurzstellungnahme.md",
      occurredAt: event.occurred_at,
      changes: event.document.changes,
      summary: event.summary,
    })
  }
  return versions.sort((a, b) => a.version - b.version)
}

export type EmailEntry = {
  key: string
  direction: "sent" | "received"
  agent: AgentId
  event: DemoEvent
}

export function deriveEmails(events: DemoEvent[]): EmailEntry[] {
  return events
    .filter((e) => e.type === "email.sent" || e.type === "email.received")
    .map((e) => ({
      key: e.event_id,
      direction: e.type === "email.sent" ? ("sent" as const) : ("received" as const),
      agent: e.agent,
      event: e,
    }))
}

export function deriveLatestCompletion(events: DemoEvent[]): DemoEvent | undefined {
  return [...events].reverse().find((e) => e.type === "run.completed")
}

export function deriveDecisions(events: DemoEvent[]): DemoEvent[] {
  return events.filter((e) => e.type === "review.decided" || e.type === "run.completed")
}

const STAGE_ORDER: AgentId[] = ["PM", "BMZ", "PEA", "TEAMLEITUNG"]

export function deriveCurrentStage(events: DemoEvent[]): { agent: AgentId | null; label: string } {
  const last = events.at(-1)
  if (!last) return { agent: null, label: "Warten auf erste Aktivität" }
  if (last.type === "run.completed") return { agent: last.agent, label: "Demo abgeschlossen" }
  const idx = STAGE_ORDER.indexOf(last.agent)
  return { agent: last.agent, label: `${last.agent}${idx >= 0 ? "" : ""}` }
}
