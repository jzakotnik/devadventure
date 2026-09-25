import type { AgentId } from "@/lib/events/types"

export type MailAttachment = {
  filename: string
  text: string
  truncated: boolean
}

export type MailMessage = {
  id: string
  /** Mailbox this message was fetched from (the recipient). */
  account: AgentId
  uid: number
  from: string
  fromAgent?: AgentId
  to: string[]
  toAgent?: AgentId
  subject: string
  date: string
  receivedAt: string
  text: string
  attachment?: MailAttachment
}

export type AccountConnectionState = "unconfigured" | "connecting" | "connected" | "error"

export type AccountStatus = {
  id: AgentId
  configured: boolean
  state: AccountConnectionState
  address?: string
  error?: string
}
