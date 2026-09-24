export type AgentId = "PM" | "BMZ" | "PEA" | "TEAMLEITUNG"

export type EventType =
  | "email.received"
  | "agent.started"
  | "document.revised"
  | "review.decided"
  | "email.sent"
  | "run.completed"
  | "agent.error"

export type DocumentChange = {
  vorher: string
  nachher: string
  begruendung: string
}

export type EmailPayload = {
  from?: string
  to?: string
  subject?: string
  body?: string
  attachment_name?: string
}

export type DocumentPayload = {
  filename?: string
  version?: number
  markdown?: string
  changes?: DocumentChange[]
}

export type ReviewPayload = {
  /** e.g. OK, AENDERUNGEN, UNKLAR, PARTNERFEEDBACK, GENEHMIGT, NACHARBEITEN */
  ergebnis?: string
  round?: number
  round_limit?: number
  round_exhausted?: boolean
}

export type CompletionPayload = {
  process_status: "completed"
  /** Was an explicit approval recorded, or did the demo continue after the review limit? */
  approval_status: "approved" | "not_granted"
  approved_version?: number | null
}

export type DemoEvent = {
  event_id: string
  run_id: string
  type: EventType
  agent: AgentId
  occurred_at: string
  received_at: string
  request_id?: string
  case_id?: string
  summary?: string
  email?: EmailPayload
  document?: DocumentPayload
  review?: ReviewPayload
  completion?: CompletionPayload
  error?: string
}

export type IncomingDemoEvent = Omit<DemoEvent, "received_at">

export function isIncomingDemoEvent(value: unknown): value is IncomingDemoEvent {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    typeof v.event_id === "string" &&
    v.event_id.trim().length > 0 &&
    typeof v.run_id === "string" &&
    v.run_id.trim().length > 0 &&
    typeof v.type === "string" &&
    typeof v.agent === "string" &&
    typeof v.occurred_at === "string"
  )
}
