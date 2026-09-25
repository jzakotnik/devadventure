"use client"

import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { AGENT_POSITION } from "@/lib/events/simple-layout"
import type { AccountStatus, MailMessage } from "@/lib/mail/types"

export function MailActor({
  id,
  status,
  lastMessage,
  justArrived,
  selected,
  onSelect,
}: {
  id: AgentId
  status?: AccountStatus
  lastMessage?: MailMessage | null
  justArrived: boolean
  selected: boolean
  onSelect: () => void
}) {
  const theme = AGENT_THEME[id]
  const RoleIcon = theme.icon
  const position = AGENT_POSITION[id]
  const isHub = id === "PM"
  const configured = status?.configured ?? false
  const connState = status?.state

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!configured}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5",
        !configured && "cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full text-white shadow-xl transition-transform",
          isHub ? "size-24" : "size-[4.5rem]",
          configured ? theme.solid : "bg-muted-foreground/30 grayscale",
          selected && "scale-110"
        )}
      >
        {justArrived ? <span className={cn("absolute -inset-1.5 animate-ping rounded-full opacity-50", theme.stripe)} /> : null}
        {selected ? <span className="ring-foreground/70 absolute -inset-1 rounded-full ring-2" /> : null}
        <UserRound className={isHub ? "size-12" : "size-9"} strokeWidth={1.6} />
        <span
          className={cn(
            "border-background absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 text-white",
            configured ? theme.solid : "bg-muted-foreground/40"
          )}
        >
          <RoleIcon className="size-3.5" />
        </span>
        {configured ? (
          <span
            title={connState}
            className={cn(
              "border-background absolute -bottom-1 -left-1 size-3.5 rounded-full border-2",
              connState === "connected" && "bg-emerald-500",
              connState === "connecting" && "bg-amber-400",
              connState === "error" && "bg-red-500"
            )}
          />
        ) : null}
      </span>
      <span className="bg-background/90 rounded-full px-2.5 py-0.5 text-sm font-bold shadow">{theme.short}</span>
      <span className="text-muted-foreground line-clamp-1 max-w-28 text-center text-[11px]">
        {!configured ? "nicht eingerichtet" : (lastMessage?.subject ?? "noch keine E-Mail")}
      </span>
    </button>
  )
}
