import { cn } from "@/lib/utils"
import type { AgentStatus } from "@/lib/events/derive"

const LABEL: Record<AgentStatus, string> = {
  idle: "Untätig",
  received: "E-Mail erhalten",
  working: "Arbeitet…",
  revising: "Überarbeitet Dokument",
  sent: "E-Mail gesendet",
  decided: "Entscheidung getroffen",
  done: "Abgeschlossen",
  error: "Fehler",
}

const CLASS: Record<AgentStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  received: "bg-accent text-accent-foreground",
  working: "bg-warning/20 text-warning-foreground dark:text-warning",
  revising: "bg-warning/20 text-warning-foreground dark:text-warning",
  sent: "bg-accent text-accent-foreground",
  decided: "bg-secondary text-secondary-foreground",
  done: "bg-success/20 text-success",
  error: "bg-destructive/15 text-destructive",
}

export function StatusBadge({ status, className }: { status: AgentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        CLASS[status],
        className
      )}
    >
      {status === "working" || status === "revising" ? (
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {LABEL[status]}
    </span>
  )
}

export { LABEL as statusLabel }
