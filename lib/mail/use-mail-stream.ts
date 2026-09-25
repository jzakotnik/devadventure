"use client"

import * as React from "react"
import type { MailMessage, AccountStatus } from "./types"

export type MailConnectionState = "connecting" | "live" | "reconnecting" | "disconnected"

export function useMailStream() {
  const [messages, setMessages] = React.useState<MailMessage[]>([])
  const [statuses, setStatuses] = React.useState<AccountStatus[]>([])
  const [connection, setConnection] = React.useState<MailConnectionState>("connecting")
  const seenIds = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    let source: EventSource | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    function ingest(incoming: MailMessage[]) {
      const fresh = incoming.filter((m) => !seenIds.current.has(m.id))
      if (!fresh.length) return
      for (const m of fresh) seenIds.current.add(m.id)
      setMessages((prev) => [...prev, ...fresh].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)))
    }

    function connect() {
      if (cancelled) return
      setConnection((c) => (c === "live" ? "reconnecting" : "connecting"))
      source = new EventSource("/api/mail/stream")

      source.addEventListener("backlog", (e) => {
        try {
          ingest(JSON.parse((e as MessageEvent).data) as MailMessage[])
        } catch {
          // ignore malformed backlog
        }
        setConnection("live")
      })

      source.addEventListener("message", (e) => {
        try {
          ingest([JSON.parse((e as MessageEvent).data) as MailMessage])
        } catch {
          // ignore malformed message
        }
      })

      source.addEventListener("status", (e) => {
        try {
          setStatuses(JSON.parse((e as MessageEvent).data) as AccountStatus[])
        } catch {
          // ignore malformed status
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
  }, [])

  return { messages, statuses, connection }
}
