import { Inbox, Loader2, PenLine, Gavel, Send, CheckCircle2, AlertTriangle, Circle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentStatus } from "@/lib/events/derive"

const LABEL: Record<AgentStatus, string> = {
  idle: "Untätig",
  received: "E-Mail erhalten",
  working: "Arbeitet…",
  revising: "Überarbeitet",
  sent: "Gesendet",
  decided: "Entschieden",
  done: "Fertig",
  error: "Fehler",
}

const COMPACT_LABEL: Record<AgentStatus, string> = {
  idle: "Untätig",
  received: "Erhalten",
  working: "Arbeitet",
  revising: "Überarbeitet",
  sent: "Gesendet",
  decided: "Entschieden",
  done: "Fertig",
  error: "Fehler",
}

const ICON: Record<AgentStatus, LucideIcon> = {
  idle: Circle,
  received: Inbox,
  working: Loader2,
  revising: PenLine,
  sent: Send,
  decided: Gavel,
  done: CheckCircle2,
  error: AlertTriangle,
}

const CLASS: Record<AgentStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  received: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  working: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  revising: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  sent: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  decided: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const SPIN: Partial<Record<AgentStatus, boolean>> = { working: true }

export function StatusBadge({
  status,
  className,
  compact = false,
}: {
  status: AgentStatus
  className?: string
  compact?: boolean
}) {
  const Icon = ICON[status]

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex w-full items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-center text-[10px] leading-tight font-semibold",
          CLASS[status],
          className
        )}
      >
        <Icon className={cn("size-3 shrink-0", SPIN[status] && "animate-spin")} />
        <span className="truncate">{COMPACT_LABEL[status]}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        CLASS[status],
        className
      )}
    >
      <Icon className={cn("size-3.5", SPIN[status] && "animate-spin")} />
      {LABEL[status]}
    </span>
  )
}

export { LABEL as statusLabel }
