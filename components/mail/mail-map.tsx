"use client"

import * as React from "react"
import type { AgentId } from "@/lib/events/types"
import { AGENT_POSITION, SATELLITE_AGENTS } from "@/lib/events/simple-layout"
import { EmailFlight } from "@/components/simple/email-flight"
import type { AccountStatus, MailMessage } from "@/lib/mail/types"
import { MailActor } from "./mail-actor"

type Flight = { id: string; from: { x: number; y: number }; to: { x: number; y: number } }

function latestFor(messages: MailMessage[], account: AgentId): MailMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].account === account) return messages[i]
  return null
}

export function MailMap({
  messages,
  statuses,
  selectedAccount,
  onSelectAccount,
}: {
  messages: MailMessage[]
  statuses: AccountStatus[]
  selectedAccount: AgentId | null
  onSelectAccount: (id: AgentId) => void
}) {
  const [flights, setFlights] = React.useState<Flight[]>([])
  const [justArrived, setJustArrived] = React.useState<Partial<Record<AgentId, boolean>>>({})
  const seenRef = React.useRef<Set<string>>(new Set())
  const hydratedRef = React.useRef(false)

  React.useEffect(() => {
    const fresh = messages.filter((m) => !seenRef.current.has(m.id))
    if (!fresh.length) return
    for (const m of fresh) seenRef.current.add(m.id)

    // Don't burst-animate the whole inbox history on first connect/reload.
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }

    for (const m of fresh) {
      setJustArrived((prev) => ({ ...prev, [m.account]: true }))
      setTimeout(() => setJustArrived((prev) => ({ ...prev, [m.account]: false })), 1600)

      if (m.fromAgent && m.fromAgent !== m.account) {
        setFlights((prev) => [...prev, { id: m.id, from: AGENT_POSITION[m.fromAgent!], to: AGENT_POSITION[m.account] }])
      }
    }
  }, [messages])

  const removeFlight = React.useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const statusFor = (id: AgentId) => statuses.find((s) => s.id === id)

  return (
    <div className="relative aspect-square w-full max-w-lg">
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

      <MailActor
        id="PM"
        status={statusFor("PM")}
        lastMessage={latestFor(messages, "PM")}
        justArrived={!!justArrived.PM}
        selected={selectedAccount === "PM"}
        onSelect={() => onSelectAccount("PM")}
      />
      {SATELLITE_AGENTS.map((id) => (
        <MailActor
          key={id}
          id={id}
          status={statusFor(id)}
          lastMessage={latestFor(messages, id)}
          justArrived={!!justArrived[id]}
          selected={selectedAccount === id}
          onSelect={() => onSelectAccount(id)}
        />
      ))}

      {flights.map((f) => (
        <EmailFlight key={f.id} from={f.from} to={f.to} onDone={() => removeFlight(f.id)} />
      ))}
    </div>
  )
}
