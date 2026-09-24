"use client"

import * as React from "react"
import { Radio } from "lucide-react"
import { useDemoEvents } from "@/lib/events/use-demo-events"
import { deriveAgentStates, deriveDocumentVersions } from "@/lib/events/derive"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import { AgentMap } from "./agent-map"
import { ProcessBar } from "./process-bar"
import { ActivityFeed } from "./activity-feed"
import { DocumentPanel } from "./document-panel"
import { DecisionsPanel } from "./decisions-panel"
import { EventDetail } from "./event-detail"
import { Controls } from "./controls"
import { Spotlight } from "./spotlight"

export function Dashboard() {
  const { events, connection, paused, setPaused, clear } = useDemoEvents()
  const [selectedAgent, setSelectedAgent] = React.useState<AgentId | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<DemoEvent | null>(null)

  const agentStates = React.useMemo(() => deriveAgentStates(events), [events])
  const documentVersions = React.useMemo(() => deriveDocumentVersions(events), [events])
  const runId = events[0]?.run_id ?? events.at(-1)?.run_id
  const latestEvent = events.at(-1)

  return (
    <div className="mx-auto flex h-screen max-w-[1680px] flex-col gap-3 overflow-hidden p-4">
      <header className="from-primary/5 shrink-0 space-y-3 rounded-xl border bg-gradient-to-r to-transparent p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 flex size-9 items-center justify-center rounded-full">
              <Radio className="text-primary size-5" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-bold">KSN Demo Control Room</h1>
              {runId ? <p className="text-muted-foreground text-xs">{runId}</p> : null}
            </div>
          </div>
        </div>
        <ProcessBar events={events} />
        <Spotlight event={latestEvent} />
        <Controls connection={connection} paused={paused} onTogglePause={() => setPaused((p) => !p)} onClear={clear} />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 xl:grid-cols-[340px_360px_1fr]">
        <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border p-3">
          <div className="shrink-0">
            <h2 className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">Agenten &amp; E-Mails</h2>
            <AgentMap states={agentStates} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          </div>
          <div className="min-h-0 flex-1">
            <h2 className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">Entscheidungen</h2>
            <DecisionsPanel events={events} />
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border p-3">
          {selectedEvent ? (
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          ) : (
            <ActivityFeed events={events} onSelect={setSelectedEvent} />
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border p-3">
          <DocumentPanel versions={documentVersions} />
        </section>
      </main>
    </div>
  )
}
