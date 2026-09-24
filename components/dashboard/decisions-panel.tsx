import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function DecisionCard({ event }: { event: DemoEvent }) {
  if (event.type === "run.completed" && event.completion) {
    const approved = event.completion.approval_status === "approved"
    return (
      <div
        className={cn(
          "space-y-1.5 rounded-lg border p-3",
          approved ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10"
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{approved ? "✅" : "🟠"}</span>
          <span>{approved ? "Teamleitung hat freigegeben" : "Demo nach Reviewlimit fortgesetzt"}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Prozess</span>
          <span className="font-medium">Abgeschlossen</span>
          <span className="text-muted-foreground">Freigabe</span>
          <span className="font-medium">{approved ? "Ausdrücklich erteilt" : "Nicht erteilt"}</span>
        </div>
        {!approved ? (
          <p className="text-muted-foreground text-xs">
            Kein grünes Häkchen für eine tatsächliche Freigabe — der Prozess wurde nur für die Demo nach
            Ausschöpfung des Reviewlimits fortgesetzt.
          </p>
        ) : null}
      </div>
    )
  }

  if (event.type === "review.decided" && event.review) {
    const { ergebnis, round, round_limit } = event.review
    const isChange = ergebnis === "AENDERUNGEN" || ergebnis === "PARTNERFEEDBACK" || ergebnis === "NACHARBEITEN"
    const isOk = ergebnis === "OK" || ergebnis === "GENEHMIGT"
    return (
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{isOk ? "✅" : isChange ? "↩" : "❓"}</span>
          <span>
            {event.agent}: {isOk ? "Zustimmung erteilt" : isChange ? "Änderungen angefordert" : "Rückmeldung unklar"}
          </span>
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
          {round ? (
            <span>
              Runde {round}
              {round_limit ? ` von ${round_limit}` : ""}
            </span>
          ) : null}
          <span>{formatTime(event.occurred_at)}</span>
        </div>
      </div>
    )
  }

  return null
}

export function DecisionsPanel({ events }: { events: DemoEvent[] }) {
  const decisions = events.filter((e) => e.type === "review.decided" || e.type === "run.completed").slice(-6).reverse()

  if (!decisions.length) {
    return <p className="text-muted-foreground text-sm">Noch keine Entscheidungen.</p>
  }

  return (
    <div className="space-y-2">
      {decisions.map((event) => (
        <DecisionCard key={event.event_id} event={event} />
      ))}
    </div>
  )
}
