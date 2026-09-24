"use client"

import * as React from "react"
import { Play, Pause, SquarePlay, Eraser, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ConnectionState } from "@/lib/events/use-demo-events"

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: "Verbinde…",
  live: "LIVE",
  reconnecting: "Verbindung wird wiederhergestellt…",
  disconnected: "Getrennt",
}

const CONNECTION_CLASS: Record<ConnectionState, string> = {
  connecting: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  reconnecting: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  disconnected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const CONNECTION_ICON = {
  connecting: RefreshCw,
  live: Wifi,
  reconnecting: RefreshCw,
  disconnected: WifiOff,
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
  const Icon = CONNECTION_ICON[connection]

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
      <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", CONNECTION_CLASS[connection])}>
        <Icon className={cn("size-3.5", (connection === "connecting" || connection === "reconnecting") && "animate-spin")} />
        {CONNECTION_LABEL[connection]}
      </span>
      {connection !== "live" ? (
        <span className="text-muted-foreground text-xs">Anzeige pausiert — Automatisierung läuft ggf. weiter</span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={runDemo} disabled={replaying}>
          <SquarePlay className="size-4" />
          {replaying ? "Läuft…" : "Demo abspielen"}
        </Button>
        <Button size="sm" variant="outline" onClick={onTogglePause}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          {paused ? "Live fortsetzen" : "Anzeige pausieren"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          <Eraser className="size-4" />
          Ansicht leeren
        </Button>
      </div>
    </div>
  )
}
