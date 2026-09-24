"use client"

import * as React from "react"
import type { DemoEvent } from "./types"

export type ConnectionState = "connecting" | "live" | "reconnecting" | "disconnected"

export function useDemoEvents() {
  const [events, setEvents] = React.useState<DemoEvent[]>([])
  const [connection, setConnection] = React.useState<ConnectionState>("connecting")
  const [paused, setPaused] = React.useState(false)
  const pendingRef = React.useRef<DemoEvent[]>([])
  const seenIds = React.useRef<Set<string>>(new Set())

  const ingest = React.useCallback((incoming: DemoEvent[]) => {
    const fresh = incoming.filter((e) => !seenIds.current.has(e.event_id))
    if (!fresh.length) return
    for (const e of fresh) seenIds.current.add(e.event_id)
    setEvents((prev) => [...prev, ...fresh].sort((a, b) => a.received_at.localeCompare(b.received_at)))
  }, [])

  React.useEffect(() => {
    let source: EventSource | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    function connect() {
      if (cancelled) return
      setConnection((c) => (c === "live" ? "reconnecting" : "connecting"))
      source = new EventSource("/api/events/stream")

      source.addEventListener("backlog", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as DemoEvent[]
          ingest(data)
        } catch {
          // ignore malformed backlog
        }
        setConnection("live")
      })

      source.addEventListener("event", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as DemoEvent
          ingest([data])
        } catch {
          // ignore malformed event
        }
      })

      source.onerror = () => {
        setConnection("reconnecting")
        source?.close()
        retryTimer = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      cancelled = true
      source?.close()
      if (retryTimer) clearTimeout(retryTimer)
      setConnection("disconnected")
    }
  }, [ingest])

  // While paused, freeze the visible list but keep buffering underneath.
  const [frozenEvents, setFrozenEvents] = React.useState<DemoEvent[] | null>(null)
  React.useEffect(() => {
    if (paused && frozenEvents === null) {
      setFrozenEvents(events)
    } else if (!paused) {
      setFrozenEvents(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  const clear = React.useCallback(() => {
    setEvents([])
    seenIds.current.clear()
    pendingRef.current = []
  }, [])

  return {
    events: paused && frozenEvents ? frozenEvents : events,
    liveCount: events.length,
    connection,
    paused,
    setPaused,
    clear,
  }
}
