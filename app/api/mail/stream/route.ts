import type { NextRequest } from "next/server"
import { startMailWatchers, getMessages, getStatuses, subscribeMessages, subscribeStatus } from "@/lib/mail/store"

export const dynamic = "force-dynamic"

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  startMailWatchers()

  const encoder = new TextEncoder()
  let unsubMessages: (() => void) | undefined
  let unsubStatus: (() => void) | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseMessage(event, data)))
        } catch {
          // controller already closed
        }
      }

      send("backlog", getMessages())
      send("status", getStatuses())

      unsubMessages = subscribeMessages((message) => send("message", message))
      unsubStatus = subscribeStatus((statuses) => send("status", statuses))

      heartbeat = setInterval(() => send("ping", { at: new Date().toISOString() }), 15000)

      request.signal.addEventListener("abort", () => {
        unsubMessages?.()
        unsubStatus?.()
        if (heartbeat) clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
    cancel() {
      unsubMessages?.()
      unsubStatus?.()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
