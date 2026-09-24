"use client"

import * as React from "react"
import Link from "next/link"
import { Radio, ArrowLeft } from "lucide-react"
import { useDemoEvents } from "@/lib/events/use-demo-events"
import { deriveAgentStates, deriveDocumentVersions } from "@/lib/events/derive"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import { Controls } from "@/components/dashboard/controls"
import { Spotlight } from "@/components/dashboard/spotlight"
import { ActorMap } from "./actor-map"
import { SidePanel } from "./side-panel"

function latestEmailFor(events: DemoEvent[], agent: AgentId): DemoEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.agent === agent && (e.type === "email.sent" || e.type === "email.received")) return e
  }
  return null
}

export function SimpleDashboard() {
  const { events, connection, paused, setPaused, clear } = useDemoEvents()
  const [selectedAgent, setSelectedAgent] = React.useState<AgentId | null>(null)
  const [selectedEmail, setSelectedEmail] = React.useState<DemoEvent | null>(null)

  const agentStates = React.useMemo(() => deriveAgentStates(events), [events])
  const documentVersions = React.useMemo(() => deriveDocumentVersions(events), [events])
  const latestEvent = events.at(-1)

  function handleSelectAgent(agent: AgentId) {
    setSelectedAgent(agent)
    setSelectedEmail(latestEmailFor(events, agent))
  }

  return (
    <div className="mx-auto flex h-screen max-w-[1400px] flex-col gap-3 overflow-hidden p-4">
      <header className="from-primary/5 shrink-0 space-y-3 rounded-xl border bg-gradient-to-r to-transparent p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 flex size-9 items-center justify-center rounded-full">
              <Radio className="text-primary size-5" />
            </span>
            <h1 className="text-lg leading-tight font-bold">KSN Demo — Übersicht</h1>
          </div>
          <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium">
            <ArrowLeft className="size-3.5" />
            Ausführliche Ansicht
          </Link>
        </div>
        <Spotlight event={latestEvent} />
        <Controls connection={connection} paused={paused} onTogglePause={() => setPaused((p) => !p)} onClear={clear} />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <section className="flex min-h-0 items-center justify-center rounded-xl border p-6">
          <ActorMap events={events} states={agentStates} selectedAgent={selectedAgent} onSelectAgent={handleSelectAgent} />
        </section>

        <section className="min-h-0">
          <SidePanel
            versions={documentVersions}
            selectedAgent={selectedAgent}
            selectedEmail={selectedEmail}
            onClearEmail={() => setSelectedEmail(null)}
          />
        </section>
      </main>
    </div>
  )
}
