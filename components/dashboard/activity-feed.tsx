"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { EVENT_ICON } from "@/lib/events/event-icon"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function ActivityFeed({
  events,
  onSelect,
}: {
  events: DemoEvent[]
  onSelect?: (event: DemoEvent) => void
}) {
  const endRef = React.useRef<HTMLDivElement>(null)
  const [follow, setFollow] = React.useState(true)

  React.useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ block: "end" })
  }, [events, follow])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold">Live-Aktivität</span>
        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            follow ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "text-muted-foreground underline underline-offset-2"
          )}
        >
          {follow ? "● folgt live" : "folgen aktivieren"}
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Noch keine Ereignisse empfangen.</p>
        ) : null}
        {events.map((event, i) => {
          const theme = AGENT_THEME[event.agent]
          const Icon = EVENT_ICON[event.type]
          const isLast = i === events.length - 1
          return (
            <button
              key={event.event_id}
              type="button"
              onClick={() => onSelect?.(event)}
              className={cn(
                "hover:bg-muted/60 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                isLast && "animate-in fade-in slide-in-from-top-1 duration-300"
              )}
            >
              <span className="text-muted-foreground w-14 shrink-0 pt-1 text-[11px] tabular-nums">
                {formatTime(event.occurred_at)}
              </span>
              <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white", theme.solid)}>
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className={cn("font-semibold", theme.text)}>{theme.short}</span>{" "}
                <span className="text-foreground/90">{event.summary ?? event.type}</span>
              </span>
            </button>
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
