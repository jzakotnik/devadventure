"use client"

import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId } from "@/lib/events/types"
import type { AgentState } from "@/lib/events/derive"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { AGENT_POSITION } from "@/lib/events/simple-layout"
import { StatusBadge } from "@/components/dashboard/status-badge"

export function Actor({
  id,
  state,
  selected,
  onSelect,
}: {
  id: AgentId
  state: AgentState
  selected: boolean
  onSelect: () => void
}) {
  const theme = AGENT_THEME[id]
  const RoleIcon = theme.icon
  const position = AGENT_POSITION[id]
  const isHub = id === "PM"
  const working = state.status === "working" || state.status === "revising"
  const active = state.status !== "idle"

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full text-white shadow-xl transition-transform",
          isHub ? "size-24" : "size-[4.5rem]",
          active ? theme.solid : "bg-muted-foreground/40 grayscale",
          selected && "scale-110",
          working && "animate-pulse"
        )}
      >
        {working ? (
          <span
            className={cn(
              "absolute -inset-2 animate-spin rounded-full border-4 border-dashed opacity-70 [animation-duration:3s]",
              theme.ring
            )}
          />
        ) : null}
        {state.status === "received" ? (
          <span className={cn("absolute -inset-1.5 animate-ping rounded-full opacity-50", theme.stripe)} />
        ) : null}
        {selected ? <span className="ring-foreground/70 absolute -inset-1 rounded-full ring-2" /> : null}
        <UserRound className={isHub ? "size-12" : "size-9"} strokeWidth={1.6} />
        <span
          className={cn(
            "border-background absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 text-white",
            active ? theme.solid : "bg-muted-foreground/50"
          )}
        >
          <RoleIcon className="size-3.5" />
        </span>
      </span>
      <span className="bg-background/90 rounded-full px-2.5 py-0.5 text-sm font-bold shadow">{theme.short}</span>
      <StatusBadge status={state.status} compact className="w-auto" />
    </button>
  )
}
