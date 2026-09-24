import { CheckCircle2, RotateCcw, HelpCircle, PartyPopper, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function DecisionCard({ event }: { event: DemoEvent }) {
  if (event.type === "run.completed" && event.completion) {
    const approved = event.completion.approval_status === "approved"
    return (
      <div
        className={cn(
          "space-y-2 rounded-xl border-2 p-3.5",
          approved
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
            : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow",
              approved ? "bg-emerald-500" : "bg-amber-500"
            )}
          >
            {approved ? <PartyPopper className="size-5" /> : <TriangleAlert className="size-5" />}
          </span>
          <span className="text-sm font-bold">
            {approved ? "Teamleitung hat freigegeben" : "Demo nach Reviewlimit fortgesetzt"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-white/60 p-2 text-xs dark:bg-black/20">
          <span className="text-muted-foreground">Prozess</span>
          <span className="font-semibold">Abgeschlossen</span>
          <span className="text-muted-foreground">Freigabe</span>
          <span className={cn("font-semibold", approved ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
            {approved ? "Ausdrücklich erteilt" : "Nicht erteilt"}
          </span>
        </div>
        {!approved ? (
          <p className="text-muted-foreground text-xs">
            Kein Häkchen für eine tatsächliche Freigabe — nur für die Demo nach Ausschöpfung des Reviewlimits fortgesetzt.
          </p>
        ) : null}
      </div>
    )
  }

  if (event.type === "review.decided" && event.review) {
    const { ergebnis, round, round_limit } = event.review
    const isChange = ergebnis === "AENDERUNGEN" || ergebnis === "PARTNERFEEDBACK" || ergebnis === "NACHARBEITEN"
    const isOk = ergebnis === "OK" || ergebnis === "GENEHMIGT"
    const theme = AGENT_THEME[event.agent]
    const Icon = isOk ? CheckCircle2 : isChange ? RotateCcw : HelpCircle
    const tone = isOk ? "bg-emerald-500" : isChange ? "bg-amber-500" : "bg-slate-400"
    return (
      <div className="bg-card rounded-xl border p-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-white", tone)}>
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-semibold">
            <span className={theme.text}>{event.agent}</span>:{" "}
            {isOk ? "Zustimmung erteilt" : isChange ? "Änderungen angefordert" : "Rückmeldung unklar"}
          </span>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-3 pl-10 text-xs">
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
