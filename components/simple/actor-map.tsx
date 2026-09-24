"use client"

import * as React from "react"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import type { AgentState } from "@/lib/events/derive"
import { AGENT_POSITION, SATELLITE_AGENTS } from "@/lib/events/simple-layout"
import { guessCounterpart } from "@/lib/events/agent-address"
import { Actor } from "./actor"
import { EmailFlight } from "./email-flight"

type Flight = { id: string; from: { x: number; y: number }; to: { x: number; y: number } }

export function ActorMap({
  events,
  states,
  selectedAgent,
  onSelectAgent,
}: {
  events: DemoEvent[]
  states: Record<AgentId, AgentState>
  selectedAgent: AgentId | null
  onSelectAgent: (agent: AgentId) => void
}) {
  const [flights, setFlights] = React.useState<Flight[]>([])
  const seenRef = React.useRef<Set<string>>(new Set())
  const hydratedRef = React.useRef(false)

  React.useEffect(() => {
    const fresh = events.filter((e) => e.type === "email.sent" && !seenRef.current.has(e.event_id))
    if (!fresh.length) return
    for (const e of fresh) seenRef.current.add(e.event_id)

    // Don't burst-animate the whole history on first connect/reload — only
    // events that arrive live from here on get a flight.
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }

    const spawned = fresh.map((e) => {
      const toAgent = guessCounterpart(e, "to")
      return {
        id: e.event_id,
        from: AGENT_POSITION[e.agent],
        to: AGENT_POSITION[toAgent],
      }
    })
    setFlights((prev) => [...prev, ...spawned])
  }, [events])

  const removeFlight = React.useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {SATELLITE_AGENTS.map((id) => (
          <line
            key={id}
            x1={AGENT_POSITION.PM.x}
            y1={AGENT_POSITION.PM.y}
            x2={AGENT_POSITION[id].x}
            y2={AGENT_POSITION[id].y}
            className="stroke-border"
            strokeWidth={0.6}
            strokeDasharray="2.5 2.5"
          />
        ))}
      </svg>

      <Actor id="PM" state={states.PM} selected={selectedAgent === "PM"} onSelect={() => onSelectAgent("PM")} />
      {SATELLITE_AGENTS.map((id) => (
        <Actor key={id} id={id} state={states[id]} selected={selectedAgent === id} onSelect={() => onSelectAgent(id)} />
      ))}

      {flights.map((f) => (
        <EmailFlight key={f.id} from={f.from} to={f.to} onDone={() => removeFlight(f.id)} />
      ))}
    </div>
  )
}
