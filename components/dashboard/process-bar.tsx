import { FileEdit, Landmark, Globe2, ShieldCheck, PartyPopper, ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"

const STEPS: { id: AgentId | "FINAL"; label: string; icon: LucideIcon }[] = [
  { id: "PM", label: "PM-Entwurf", icon: FileEdit },
  { id: "BMZ", label: "BMZ", icon: Landmark },
  { id: "PEA", label: "PEA", icon: Globe2 },
  { id: "TEAMLEITUNG", label: "Teamleitung", icon: ShieldCheck },
  { id: "FINAL", label: "Abschluss", icon: PartyPopper },
]

export function ProcessBar({ events }: { events: DemoEvent[] }) {
  const completed = events.some((e) => e.type === "run.completed")
  const lastAgent = events.at(-1)?.agent
  const activeIndex = completed ? STEPS.length - 1 : STEPS.findIndex((s) => s.id === lastAgent)

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs">
      {STEPS.map((step, i) => {
        const state = i < activeIndex || (completed && i <= activeIndex) ? "done" : i === activeIndex ? "active" : "pending"
        const theme = step.id !== "FINAL" ? AGENT_THEME[step.id] : undefined
        const Icon = step.icon
        return (
          <div key={step.id} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-semibold whitespace-nowrap transition-all",
                state === "done" &&
                  cn("border-transparent text-white shadow-sm", theme?.solid ?? "bg-emerald-500"),
                state === "active" &&
                  cn("scale-105 border-current shadow-md", theme?.text ?? "text-emerald-600", theme?.soft ?? "bg-emerald-50"),
                state === "pending" && "border-border text-muted-foreground/70"
              )}
            >
              <Icon className={cn("size-3.5", state === "active" && "animate-pulse")} />
              {step.label}
            </span>
            {i < STEPS.length - 1 ? <ChevronRight className="text-muted-foreground/40 size-4 shrink-0" /> : null}
          </div>
        )
      })}
    </div>
  )
}
