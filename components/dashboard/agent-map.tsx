"use client"

import { cn } from "@/lib/utils"
import type { AgentId } from "@/lib/events/types"
import type { AgentState } from "@/lib/events/derive"
import { StatusBadge } from "./status-badge"
import { ElapsedTimer } from "./elapsed-timer"

const AGENT_LABEL: Record<AgentId, string> = {
  PM: "Projektleitung",
  BMZ: "BMZ",
  PEA: "Partner (PEA)",
  TEAMLEITUNG: "Teamleitung",
}

function formatTime(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function AgentCard({
  id,
  state,
  onSelect,
  selected,
}: {
  id: AgentId
  state: AgentState
  onSelect: () => void
  selected: boolean
}) {
  const active = state.status !== "idle"
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
        active ? "border-border bg-card" : "border-border/60 bg-muted/40",
        selected && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{AGENT_LABEL[id]}</span>
        <StatusBadge status={state.status} />
      </div>
      <div className="text-muted-foreground min-h-8 text-xs">
        {state.status === "working" && state.workingSince ? (
          <ElapsedTimer since={state.workingSince} />
        ) : (
          state.lastEvent?.summary
        )}
      </div>
      {state.lastEvent ? (
        <div className="text-muted-foreground/70 text-[11px]">{formatTime(state.lastEvent.occurred_at)}</div>
      ) : null}
    </button>
  )
}

export function AgentMap({
  states,
  selectedAgent,
  onSelectAgent,
}: {
  states: Record<AgentId, AgentState>
  selectedAgent: AgentId | null
  onSelectAgent: (agent: AgentId) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <AgentCard id="PM" state={states.PM} onSelect={() => onSelectAgent("PM")} selected={selectedAgent === "PM"} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AgentCard id="BMZ" state={states.BMZ} onSelect={() => onSelectAgent("BMZ")} selected={selectedAgent === "BMZ"} />
        <AgentCard id="PEA" state={states.PEA} onSelect={() => onSelectAgent("PEA")} selected={selectedAgent === "PEA"} />
        <AgentCard
          id="TEAMLEITUNG"
          state={states.TEAMLEITUNG}
          onSelect={() => onSelectAgent("TEAMLEITUNG")}
          selected={selectedAgent === "TEAMLEITUNG"}
        />
      </div>
    </div>
  )
}
