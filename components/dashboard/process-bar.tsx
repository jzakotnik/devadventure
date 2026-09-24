import { cn } from "@/lib/utils"
import type { AgentId, DemoEvent } from "@/lib/events/types"

const STEPS: { id: AgentId | "FINAL"; label: string }[] = [
  { id: "PM", label: "PM-Entwurf" },
  { id: "BMZ", label: "BMZ" },
  { id: "PEA", label: "PEA" },
  { id: "TEAMLEITUNG", label: "Teamleitung" },
  { id: "FINAL", label: "Abschluss" },
]

export function ProcessBar({ events }: { events: DemoEvent[] }) {
  const completed = events.some((e) => e.type === "run.completed")
  const lastAgent = events.at(-1)?.agent
  const activeIndex = completed ? STEPS.length - 1 : STEPS.findIndex((s) => s.id === lastAgent)

  return (
    <div className="flex items-center gap-1 overflow-x-auto text-xs">
      {STEPS.map((step, i) => {
        const state = i < activeIndex || completed && i <= activeIndex ? "done" : i === activeIndex ? "active" : "pending"
        return (
          <div key={step.id} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-medium whitespace-nowrap",
                state === "done" && "border-success/40 bg-success/10 text-success",
                state === "active" && "border-ring bg-accent text-accent-foreground",
                state === "pending" && "border-border text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 ? <span className="text-muted-foreground/50">→</span> : null}
          </div>
        )
      })}
    </div>
  )
}
