"use client"

import * as React from "react"
import { Radio, Wifi, WifiOff, RefreshCw, Mail as MailIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMailStream, type MailConnectionState } from "@/lib/mail/use-mail-stream"
import { deriveDocumentVersionsFromMail } from "@/lib/mail/derive"
import type { AgentId } from "@/lib/events/types"
import type { MailMessage } from "@/lib/mail/types"
import { DocumentPanel } from "@/components/dashboard/document-panel"
import { ViewSwitcher } from "@/components/view-switcher"
import { MailMap } from "./mail-map"
import { MessageDetail } from "./message-detail"
import { SetupNotice } from "./setup-notice"

const CONNECTION_LABEL: Record<MailConnectionState, string> = {
  connecting: "Verbinde…",
  live: "LIVE",
  reconnecting: "Verbindung wird wiederhergestellt…",
  disconnected: "Getrennt",
}

const CONNECTION_CLASS: Record<MailConnectionState, string> = {
  connecting: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  reconnecting: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  disconnected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const CONNECTION_ICON = { connecting: RefreshCw, live: Wifi, reconnecting: RefreshCw, disconnected: WifiOff }

function latestMessageFor(messages: MailMessage[], account: AgentId): MailMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].account === account) return messages[i]
  return null
}

export function MailDashboard() {
  const { messages, statuses, connection } = useMailStream()
  const [selectedAccount, setSelectedAccount] = React.useState<AgentId | null>(null)
  const [selectedMessage, setSelectedMessage] = React.useState<MailMessage | null>(null)

  const documentVersions = React.useMemo(() => deriveDocumentVersionsFromMail(messages), [messages])
  const anyConfigured = statuses.some((s) => s.configured)
  const allConfigured = statuses.length > 0 && statuses.every((s) => s.configured)
  const Icon = CONNECTION_ICON[connection]

  const latestOverall = messages.at(-1) ?? null
  const displayedMessage = selectedMessage ?? latestOverall

  function handleSelectAccount(id: AgentId) {
    setSelectedAccount(id)
    setSelectedMessage(latestMessageFor(messages, id))
  }

  function clearSelection() {
    setSelectedAccount(null)
    setSelectedMessage(null)
  }

  return (
    <div className="mx-auto flex h-screen max-w-[1600px] flex-col gap-3 overflow-hidden p-4">
      <header className="from-primary/5 shrink-0 space-y-3 rounded-xl border bg-gradient-to-r to-transparent p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 flex size-9 items-center justify-center rounded-full">
              <Radio className="text-primary size-5" />
            </span>
            <h1 className="text-lg leading-tight font-bold">KSN Demo — E-Mail-Verkehr</h1>
          </div>
          <ViewSwitcher />
        </div>
        <p className="text-muted-foreground text-xs">
          Ausschließlich aus den vier IMAP-Postfächern gelesen — keine n8n-internen Zustände oder IDs.
        </p>
        <span className={cn("flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", CONNECTION_CLASS[connection])}>
          <Icon className={cn("size-3.5", (connection === "connecting" || connection === "reconnecting") && "animate-spin")} />
          {CONNECTION_LABEL[connection]}
        </span>
      </header>

      {!anyConfigured ? (
        <main className="flex flex-1 items-center justify-center overflow-y-auto rounded-xl border p-6">
          <SetupNotice statuses={statuses} />
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border p-6">
            {!allConfigured ? <SetupNotice statuses={statuses} compact /> : null}
            <div className="flex flex-1 items-center justify-start">
              <MailMap
                messages={messages}
                statuses={statuses}
                selectedAccount={selectedAccount}
                onSelectAccount={handleSelectAccount}
              />
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-2 gap-4">
            <div className="flex min-h-0 flex-col rounded-xl border p-3">
              <div className="text-muted-foreground mb-2 flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
                <MailIcon className="size-3.5" />
                Letzte E-Mail
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {displayedMessage ? (
                  <MessageDetail message={displayedMessage} onClose={clearSelection} />
                ) : (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                    Noch keine E-Mail empfangen.
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border p-3">
              <DocumentPanel versions={documentVersions} />
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
