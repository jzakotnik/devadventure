"use client"

import * as React from "react"
import { FileText, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId, DemoEvent } from "@/lib/events/types"
import type { DocumentVersion } from "@/lib/events/derive"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { DocumentPanel } from "@/components/dashboard/document-panel"
import { EventDetail } from "@/components/dashboard/event-detail"

type Tab = "document" | "email"

export function SidePanel({
  versions,
  selectedAgent,
  selectedEmail,
  onClearEmail,
}: {
  versions: DocumentVersion[]
  selectedAgent: AgentId | null
  selectedEmail: DemoEvent | null
  onClearEmail: () => void
}) {
  const [tab, setTab] = React.useState<Tab>("document")

  React.useEffect(() => {
    if (selectedEmail) setTab("email")
  }, [selectedEmail])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border p-3">
      <div className="mb-2 flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setTab("document")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            tab === "document" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <FileText className="size-4" />
          Dokument
        </button>
        <button
          type="button"
          onClick={() => selectedEmail && setTab("email")}
          disabled={!selectedEmail}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40",
            tab === "email" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Mail className="size-4" />
          E-Mail
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "email" && selectedEmail ? (
          <EventDetail event={selectedEmail} onClose={onClearEmail} />
        ) : tab === "document" ? (
          <DocumentPanel versions={versions} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
            {selectedAgent
              ? `Noch keine E-Mail von ${AGENT_THEME[selectedAgent].label} erfasst.`
              : "Klicken Sie auf eine Person, um deren letzte E-Mail zu sehen."}
          </div>
        )}
      </div>
    </div>
  )
}
