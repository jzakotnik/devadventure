import { Inbox, Loader2, PenLine, Gavel, Send, CheckCircle2, AlertTriangle, type LucideIcon } from "lucide-react"
import type { EventType } from "./types"

export const EVENT_ICON: Record<EventType, LucideIcon> = {
  "email.received": Inbox,
  "agent.started": Loader2,
  "document.revised": PenLine,
  "review.decided": Gavel,
  "email.sent": Send,
  "run.completed": CheckCircle2,
  "agent.error": AlertTriangle,
}

export const EVENT_COLOR: Record<EventType, string> = {
  "email.received": "text-sky-500",
  "agent.started": "text-amber-500",
  "document.revised": "text-blue-500",
  "review.decided": "text-violet-500",
  "email.sent": "text-sky-500",
  "run.completed": "text-emerald-500",
  "agent.error": "text-red-500",
}
