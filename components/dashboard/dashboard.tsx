"use client"

import * as React from "react"
import { useDemoEvents } from "@/lib/events/use-demo-events"
import {
  deriveAgentStates,
  deriveDocumentVersions,
  deriveLatestCompletion,
} from "@/lib/events/derive"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import { AgentMap } from "./agent-map"
import { ProcessBar } from "./process-bar"
import { ActivityFeed } from "./activity-feed"
import { DocumentPanel } from "./document-panel"
import { DecisionsPanel } from "./decisions-panel"
import { EventDetail } from "./event-detail"
import { Controls } from "./controls"

export function Dashboard() {
  const { events, connection, paused, setPaused, clear } = useDemoEvents()
  const [selectedAgent, setSelectedAgent] = React.useState<AgentId | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<DemoEvent | null>(null)

  const agentStates = React.useMemo(() => deriveAgentStates(events), [events])
  const documentVersions = React.useMemo(() => deriveDocumentVersions(events), [events])
  const completion = React.useMemo(() => deriveLatestCompletion(events), [events])
  const runId = events[0]?.run_id ?? events.at(-1)?.run_id

  return (
    <div className="mx-auto flex h-screen max-w-[1600px] flex-col gap-4 overflow-hidden p-4">
      <header className="flex shrink-0 flex-col gap-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">KSN Demo Control Room{runId ? ` · ${runId}` : ""}</h1>
            {documentVersions.length ? (
              <p className="text-muted-foreground text-xs">
                Version {documentVersions.at(-1)?.version} · {completion ? "Demo abgeschlossen" : "läuft"}
              </p>
            ) : null}
          </div>
        </div>
        <ProcessBar events={events} />
        <Controls connection={connection} paused={paused} onTogglePause={() => setPaused((p) => !p)} onClear={clear} />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[340px_360px_1fr]">
        <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border p-3">
          <div className="shrink-0">
            <h2 className="mb-2 text-sm font-semibold">Agenten &amp; E-Mails</h2>
            <AgentMap states={agentStates} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          </div>
          <div className="min-h-0 flex-1">
            <h2 className="mb-2 text-sm font-semibold">Entscheidungen</h2>
            <DecisionsPanel events={events} />
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-lg border p-3">
          {selectedEvent ? (
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          ) : (
            <ActivityFeed events={events} onSelect={setSelectedEvent} />
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border p-3">
          <DocumentPanel versions={documentVersions} />
        </section>
      </main>
    </div>
  )
}
