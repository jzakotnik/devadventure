"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ConnectionState } from "@/lib/events/use-demo-events"

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: "Verbinde…",
  live: "LIVE",
  reconnecting: "Verbindung wird wiederhergestellt…",
  disconnected: "Getrennt",
}

const CONNECTION_DOT: Record<ConnectionState, string> = {
  connecting: "bg-warning",
  live: "bg-success",
  reconnecting: "bg-warning",
  disconnected: "bg-destructive",
}

export function Controls({
  connection,
  paused,
  onTogglePause,
  onClear,
}: {
  connection: ConnectionState
  paused: boolean
  onTogglePause: () => void
  onClear: () => void
}) {
  const [replaying, setReplaying] = React.useState(false)

  async function runDemo() {
    setReplaying(true)
    try {
      await fetch("/api/events/demo", { method: "POST" })
    } finally {
      setTimeout(() => setReplaying(false), 1500)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <span className={cn("size-2 rounded-full", CONNECTION_DOT[connection])} />
        {CONNECTION_LABEL[connection]}
      </span>
      {connection !== "live" ? (
        <span className="text-muted-foreground text-xs">Anzeige pausiert — Automatisierung läuft ggf. weiter</span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={runDemo} disabled={replaying}>
          {replaying ? "Läuft…" : "Demo abspielen"}
        </Button>
        <Button size="sm" variant="outline" onClick={onTogglePause}>
          {paused ? "Live fortsetzen" : "Anzeige pausieren"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Ansicht leeren
        </Button>
      </div>
    </div>
  )
}
