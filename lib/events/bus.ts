import { EventEmitter } from "node:events"
import type { DemoEvent } from "./types"

/**
 * Process-local event bus. Requires a single long-lived Node process
 * (`next dev` / `next start`) — not a serverless/edge deployment, where the
 * POST and the SSE connection could land on different instances and never
 * see each other.
 */

const MAX_BUFFER_SIZE = 500
const MAX_BUFFER_BYTES = 8 * 1024 * 1024 // 8MB, markdown snapshots add up fast

type BusState = {
  emitter: EventEmitter
  buffer: DemoEvent[]
  seenIds: Set<string>
}

const globalForBus = globalThis as unknown as { __demoBus?: BusState }

function getBus(): BusState {
  if (!globalForBus.__demoBus) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(0)
    globalForBus.__demoBus = { emitter, buffer: [], seenIds: new Set() }
  }
  return globalForBus.__demoBus
}

function bufferBytes(buffer: DemoEvent[]): number {
  return buffer.reduce((sum, e) => sum + Buffer.byteLength(JSON.stringify(e), "utf8"), 0)
}

/** Returns false if the event was a duplicate (by event_id) and was ignored. */
export function publishEvent(event: DemoEvent): boolean {
  const bus = getBus()
  if (bus.seenIds.has(event.event_id)) return false

  bus.buffer.push(event)
  bus.seenIds.add(event.event_id)

  while (bus.buffer.length > MAX_BUFFER_SIZE || bufferBytes(bus.buffer) > MAX_BUFFER_BYTES) {
    const dropped = bus.buffer.shift()
    if (dropped) bus.seenIds.delete(dropped.event_id)
    if (!bus.buffer.length) break
  }

  bus.emitter.emit("event", event)
  return true
}

export function getBufferedEvents(): DemoEvent[] {
  return [...getBus().buffer]
}

export function subscribe(listener: (event: DemoEvent) => void): () => void {
  const bus = getBus()
  bus.emitter.on("event", listener)
  return () => bus.emitter.off("event", listener)
}

export function clearBuffer(): void {
  const bus = getBus()
  bus.buffer = []
  bus.seenIds.clear()
}
