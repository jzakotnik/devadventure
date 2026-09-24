import { NextResponse, type NextRequest } from "next/server"
import { publishEvent, getBufferedEvents, clearBuffer } from "@/lib/events/bus"
import { isIncomingDemoEvent } from "@/lib/events/types"

export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.DEMO_EVENTS_SECRET
  if (!secret) return true // no secret configured, e.g. local dev
  return request.headers.get("x-demo-secret") === secret
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (!isIncomingDemoEvent(body)) {
    return NextResponse.json(
      { error: "invalid_event", detail: "event_id, run_id, type, agent, occurred_at are required" },
      { status: 400 }
    )
  }

  const stored = publishEvent({ ...body, received_at: new Date().toISOString() })
  return NextResponse.json({ ok: true, stored })
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ events: getBufferedEvents() })
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  clearBuffer()
  return NextResponse.json({ ok: true })
}
