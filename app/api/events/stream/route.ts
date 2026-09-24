import type { NextRequest } from "next/server"
import { getBufferedEvents, subscribe } from "@/lib/events/bus"

export const dynamic = "force-dynamic"

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined
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

      send("backlog", getBufferedEvents())

      unsubscribe = subscribe((event) => send("event", event))

      heartbeat = setInterval(() => send("ping", { at: new Date().toISOString() }), 15000)

      request.signal.addEventListener("abort", () => {
        unsubscribe?.()
        if (heartbeat) clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
    cancel() {
      unsubscribe?.()
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
