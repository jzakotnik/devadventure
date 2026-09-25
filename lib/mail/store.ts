import { EventEmitter } from "node:events"
import { ImapFlow } from "imapflow"
import { simpleParser, type AddressObject } from "mailparser"
import type { AgentId } from "@/lib/events/types"
import { loadMailAccounts, buildAddressDirectory, type MailAccountConfig, ROLES } from "./config"
import type { MailMessage, AccountStatus, MailAttachment } from "./types"

const MAX_BUFFER_SIZE = 300
const RECONNECT_DELAY_MS = 5000
const ATTACHMENT_MAX_BYTES = 200_000
const TEXT_ATTACHMENT_RE = /\.(md|markdown|txt)$/i

type MailBusState = {
  emitter: EventEmitter
  messages: MailMessage[]
  seenIds: Set<string>
  statuses: Map<AgentId, AccountStatus>
  started: boolean
}

const globalForMail = globalThis as unknown as { __mailBus?: MailBusState }

function getBus(): MailBusState {
  if (!globalForMail.__mailBus) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(0)
    globalForMail.__mailBus = {
      emitter,
      messages: [],
      seenIds: new Set(),
      statuses: new Map(ROLES.map((id) => [id, { id, configured: false, state: "unconfigured" as const }])),
      started: false,
    }
  }
  return globalForMail.__mailBus
}

function setStatus(id: AgentId, patch: Partial<AccountStatus>) {
  const bus = getBus()
  const current = bus.statuses.get(id) ?? { id, configured: false, state: "unconfigured" as const }
  const next: AccountStatus = { ...current, ...patch }
  bus.statuses.set(id, next)
  bus.emitter.emit("status", getStatuses())
}

function publishMessage(message: MailMessage) {
  const bus = getBus()
  if (bus.seenIds.has(message.id)) return
  bus.messages.push(message)
  bus.seenIds.add(message.id)
  while (bus.messages.length > MAX_BUFFER_SIZE) {
    const dropped = bus.messages.shift()
    if (dropped) bus.seenIds.delete(dropped.id)
  }
  bus.emitter.emit("message", message)
}

export function getMessages(): MailMessage[] {
  return [...getBus().messages]
}

export function getStatuses(): AccountStatus[] {
  return ROLES.map((id) => getBus().statuses.get(id) ?? { id, configured: false, state: "unconfigured" as const })
}

export function subscribeMessages(listener: (message: MailMessage) => void): () => void {
  const bus = getBus()
  bus.emitter.on("message", listener)
  return () => bus.emitter.off("message", listener)
}

export function subscribeStatus(listener: (statuses: AccountStatus[]) => void): () => void {
  const bus = getBus()
  bus.emitter.on("status", listener)
  return () => bus.emitter.off("status", listener)
}

function addressesFrom(field?: AddressObject | AddressObject[]): string[] {
  if (!field) return []
  const objects = Array.isArray(field) ? field : [field]
  return objects.flatMap((o) => o.value.map((v) => v.address).filter((a): a is string => Boolean(a)))
}

function pickTextAttachment(attachments: { filename?: string; content: Buffer; size: number }[]): MailAttachment | undefined {
  const match = attachments.find((a) => a.filename && TEXT_ATTACHMENT_RE.test(a.filename))
  if (!match) return undefined
  const truncated = match.size > ATTACHMENT_MAX_BYTES
  const text = match.content.subarray(0, ATTACHMENT_MAX_BYTES).toString("utf8")
  return { filename: match.filename!, text, truncated }
}

async function handleFetchedMessage(
  account: MailAccountConfig,
  directory: Map<string, AgentId>,
  uid: number,
  source: Buffer
) {
  const parsed = await simpleParser(source)
  const fromAddress = parsed.from?.value?.[0]?.address?.trim().toLowerCase()
  const toAddresses = addressesFrom(parsed.to).map((a) => a.trim().toLowerCase())

  const message: MailMessage = {
    id: `${account.id}:${uid}`,
    account: account.id,
    uid,
    from: fromAddress ?? "unbekannt",
    fromAgent: fromAddress ? directory.get(fromAddress) : undefined,
    to: toAddresses,
    toAgent: toAddresses.map((a) => directory.get(a)).find(Boolean),
    subject: parsed.subject ?? "(kein Betreff)",
    date: (parsed.date ?? new Date()).toISOString(),
    receivedAt: new Date().toISOString(),
    text: (parsed.text ?? "").slice(0, 20000),
    attachment: pickTextAttachment(parsed.attachments),
  }
  publishMessage(message)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function watchAccount(account: MailAccountConfig, directory: Map<string, AgentId>) {
  setStatus(account.id, { configured: true, address: account.user })

  for (;;) {
    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.secure,
      auth: { user: account.user, pass: account.password },
      logger: false,
    })

    try {
      setStatus(account.id, { state: "connecting", error: undefined })
      await client.connect()
      const mailbox = await client.mailboxOpen("INBOX", { readOnly: true })
      let lastUid = mailbox.uidNext - 1
      setStatus(account.id, { state: "connected", error: undefined })

      const processNew = async () => {
        try {
          for await (const msg of client.fetch(`${lastUid + 1}:*`, { uid: true, source: true }, { uid: true })) {
            if (msg.uid <= lastUid) continue
            lastUid = msg.uid
            if (msg.source) await handleFetchedMessage(account, directory, msg.uid, msg.source)
          }
        } catch (err) {
          setStatus(account.id, { state: "error", error: String((err as Error)?.message ?? err) })
        }
      }

      client.on("exists", () => {
        void processNew()
      })

      await new Promise<void>((resolve) => {
        client.on("close", () => resolve())
        client.on("error", (err) => {
          setStatus(account.id, { state: "error", error: String(err?.message ?? err) })
          resolve()
        })
      })
    } catch (err) {
      setStatus(account.id, { state: "error", error: String((err as Error)?.message ?? err) })
    } finally {
      try {
        client.close()
      } catch {
        // already closed
      }
    }

    await sleep(RECONNECT_DELAY_MS)
  }
}

/** Idempotent: safe to call from every request, only actually starts watchers once per process. */
export function startMailWatchers() {
  const bus = getBus()
  if (bus.started) return
  bus.started = true

  const accounts = loadMailAccounts()
  const directory = buildAddressDirectory(accounts)
  for (const account of accounts) {
    void watchAccount(account, directory)
  }
}
