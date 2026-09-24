"use client"

import { cn } from "@/lib/utils"
import type { AgentId } from "@/lib/events/types"
import type { AgentState } from "@/lib/events/derive"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { StatusBadge } from "./status-badge"
import { ElapsedTimer } from "./elapsed-timer"

function formatTime(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function CardShell({
  theme,
  active,
  working,
  selected,
  onSelect,
  children,
}: {
  theme: (typeof AGENT_THEME)[AgentId]
  active: boolean
  working: boolean
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-xl border-2 p-3 text-left shadow-sm transition-all",
        active ? theme.soft : "border-border/50 bg-muted/30 grayscale-[0.4]",
        selected && cn("ring-2 ring-offset-2 ring-offset-background", theme.ring),
        working && "shadow-md"
      )}
    >
      <span className="absolute inset-0 overflow-hidden rounded-[10px]">
        <span className={cn("absolute inset-y-0 left-0 w-1.5", theme.stripe, !active && "opacity-30")} />
        {working ? (
          <span className={cn("absolute -top-6 -right-6 size-20 rounded-full opacity-20 blur-xl", theme.stripe)} />
        ) : null}
      </span>
      <div className="relative min-w-0">{children}</div>
    </button>
  )
}

function PmCard({
  state,
  onSelect,
  selected,
}: {
  state: AgentState
  onSelect: () => void
  selected: boolean
}) {
  const theme = AGENT_THEME.PM
  const Icon = theme.icon
  const active = state.status !== "idle"
  const working = state.status === "working" || state.status === "revising"

  return (
    <CardShell theme={theme} active={active} working={working} selected={selected} onSelect={onSelect}>
      <div className="flex items-center gap-2.5 pl-1.5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow",
            active ? theme.solid : "bg-muted-foreground/40",
            working && "animate-pulse"
          )}
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">{theme.label}</div>
          <div className="mt-0.5">
            <StatusBadge status={state.status} />
          </div>
        </div>
      </div>
      <div className="text-muted-foreground mt-1.5 pl-1.5 text-xs">
        {state.status === "working" && state.workingSince ? (
          <span className={cn("font-medium", theme.text)}>
            <ElapsedTimer since={state.workingSince} />
          </span>
        ) : (
          <span className="line-clamp-2">{state.lastEvent?.summary ?? "Noch keine Aktivität"}</span>
        )}
      </div>
      {state.lastEvent ? (
        <div className="text-muted-foreground/60 pl-1.5 text-[11px]">{formatTime(state.lastEvent.occurred_at)}</div>
      ) : null}
    </CardShell>
  )
}

function CompactCard({
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
  const theme = AGENT_THEME[id]
  const Icon = theme.icon
  const active = state.status !== "idle"
  const working = state.status === "working" || state.status === "revising"

  return (
    <CardShell theme={theme} active={active} working={working} selected={selected} onSelect={onSelect}>
      <div className="flex flex-col items-center gap-1.5 pl-1.5 text-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow",
            active ? theme.solid : "bg-muted-foreground/40",
            working && "animate-pulse"
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="text-sm font-semibold">{theme.short}</div>
        <StatusBadge status={state.status} compact />
        <div className="text-muted-foreground line-clamp-2 text-[11px]">
          {state.status === "working" && state.workingSince ? (
            <span className={cn("font-medium", theme.text)}>
              <ElapsedTimer since={state.workingSince} />
            </span>
          ) : (
            (state.lastEvent?.summary ?? "—")
          )}
        </div>
      </div>
    </CardShell>
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
      <PmCard state={states.PM} onSelect={() => onSelectAgent("PM")} selected={selectedAgent === "PM"} />
      <div className="grid grid-cols-3 gap-2.5">
        <CompactCard id="BMZ" state={states.BMZ} onSelect={() => onSelectAgent("BMZ")} selected={selectedAgent === "BMZ"} />
        <CompactCard id="PEA" state={states.PEA} onSelect={() => onSelectAgent("PEA")} selected={selectedAgent === "PEA"} />
        <CompactCard
          id="TEAMLEITUNG"
          state={states.TEAMLEITUNG}
          onSelect={() => onSelectAgent("TEAMLEITUNG")}
          selected={selectedAgent === "TEAMLEITUNG"}
        />
      </div>
    </div>
  )
}
