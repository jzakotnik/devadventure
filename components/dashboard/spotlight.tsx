"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { EVENT_ICON } from "@/lib/events/event-icon"

export function Spotlight({ event }: { event?: DemoEvent }) {
  if (!event) {
    return (
      <div className="text-muted-foreground flex items-center gap-3 rounded-xl border-2 border-dashed p-4">
        <Sparkles className="size-6 shrink-0" />
        <span className="text-lg font-medium">Bereit für die Demo — noch keine Aktivität</span>
      </div>
    )
  }

  const theme = AGENT_THEME[event.agent]
  const Icon = EVENT_ICON[event.type]
  const isPulse = event.type === "agent.started" || event.type === "document.revised"

  return (
    <div
      key={event.event_id}
      className={cn(
        "animate-in fade-in slide-in-from-top-2 flex items-center gap-4 rounded-xl border-2 p-4 duration-300",
        theme.soft
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg",
          theme.solid,
          isPulse && "animate-pulse"
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-xs font-bold tracking-wide uppercase", theme.text)}>{theme.label}</div>
        <div className="truncate text-xl font-bold">{event.summary ?? event.type}</div>
      </div>
    </div>
  )
}
