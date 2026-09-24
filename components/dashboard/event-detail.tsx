import type { DemoEvent } from "@/lib/events/types"
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
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{event.summary ?? event.type}</div>
          <div className="text-muted-foreground text-xs">
            {event.agent} · {formatTime(event.occurred_at)}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Schließen
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
