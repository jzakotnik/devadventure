import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { EVENT_ICON } from "@/lib/events/event-icon"
import { Button } from "@/components/ui/button"

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  )
}

export function EventDetail({ event, onClose }: { event: DemoEvent; onClose: () => void }) {
  const theme = AGENT_THEME[event.agent]
  const Icon = EVENT_ICON[event.type]
  return (
    <div className="flex h-full flex-col gap-3">
      <div className={cn("flex items-start justify-between gap-2 rounded-lg border-2 p-3", theme.soft)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white", theme.solid)}>
            <Icon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{event.summary ?? event.type}</div>
            <div className={cn("text-xs font-medium", theme.text)}>
              {theme.label} · {formatTime(event.occurred_at)}
            </div>
          </div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Row label="Typ" value={event.type} />
        <Row label="Vorgang" value={event.case_id} />
        <Row label="Anfrage" value={event.request_id} />
      </div>

      {event.email ? (
        <div className="space-y-1.5 rounded-md border p-2.5">
          <div className="text-xs font-semibold">E-Mail</div>
          <Row label="Von" value={event.email.from} />
          <Row label="An" value={event.email.to} />
          <Row label="Betreff" value={event.email.subject} />
          {event.email.body ? (
            <p className="text-foreground/90 mt-1 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
              {event.email.body}
            </p>
          ) : null}
          <Row label="Anhang" value={event.email.attachment_name} />
        </div>
      ) : null}

      {event.review ? (
        <div className="space-y-1.5 rounded-md border p-2.5">
          <div className="text-xs font-semibold">Review-Ergebnis</div>
          <Row label="Ergebnis" value={event.review.ergebnis} />
          <Row
            label="Runde"
            value={event.review.round ? `${event.review.round}${event.review.round_limit ? ` / ${event.review.round_limit}` : ""}` : undefined}
          />
        </div>
      ) : null}

      {event.document ? (
        <div className="space-y-1.5 rounded-md border p-2.5">
          <div className="text-xs font-semibold">Dokument</div>
          <Row label="Datei" value={event.document.filename} />
          <Row label="Version" value={event.document.version} />
          <Row label="Änderungen" value={event.document.changes?.length} />
        </div>
      ) : null}

      {event.error ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2.5 text-sm">
          {event.error}
        </div>
      ) : null}
    </div>
  )
}
