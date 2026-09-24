"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DemoEvent } from "@/lib/events/types"

const TYPE_ICON: Record<DemoEvent["type"], string> = {
  "email.received": "✉",
  "agent.started": "⋯",
  "document.revised": "✎",
  "review.decided": "⚖",
  "email.sent": "➤",
  "run.completed": "✔",
  "agent.error": "⚠",
}

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
            "text-xs",
            follow ? "text-foreground" : "text-muted-foreground underline underline-offset-2"
          )}
        >
          {follow ? "folgt live" : "folgen aktivieren"}
        </button>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Noch keine Ereignisse empfangen.</p>
        ) : null}
        {events.map((event) => (
          <button
            key={event.event_id}
            type="button"
            onClick={() => onSelect?.(event)}
            className="hover:bg-muted/60 flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          >
            <span className="text-muted-foreground w-16 shrink-0 pt-0.5 text-[11px] tabular-nums">
              {formatTime(event.occurred_at)}
            </span>
            <span className="pt-0.5 text-xs" aria-hidden>
              {TYPE_ICON[event.type]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{event.agent}</span>{" "}
              <span className="text-foreground/90">{event.summary ?? event.type}</span>
            </span>
          </button>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
