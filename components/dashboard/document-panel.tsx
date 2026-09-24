"use client"

import * as React from "react"
import { diffWordsWithSpace } from "diff"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FileText, GitCompare, History as HistoryIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DocumentVersion } from "@/lib/events/derive"
import type { AgentId } from "@/lib/events/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"

type Tab = "read" | "changes" | "history"

const AGENT_LABEL: Record<string, string> = {
  PM: "PM",
  BMZ: "BMZ",
  PEA: "PEA (Partner)",
  TEAMLEITUNG: "Teamleitung",
}

const TAB_ICON: Record<Tab, typeof FileText> = {
  read: FileText,
  changes: GitCompare,
  history: HistoryIcon,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })
}

function InlineDiff({ before, after }: { before: string; after: string }) {
  const parts = diffWordsWithSpace(before, after)
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span
          key={i}
          className={cn(
            part.added && "bg-success/20 text-success rounded px-0.5",
            part.removed && "bg-destructive/15 text-destructive rounded px-0.5 line-through"
          )}
        >
          {part.value}
        </span>
      ))}
    </p>
  )
}

export function DocumentPanel({ versions }: { versions: DocumentVersion[] }) {
  const [tab, setTab] = React.useState<Tab>("read")
  const latest = versions.at(-1)
  const [historySelection, setHistorySelection] = React.useState<number | null>(null)

  const selected = historySelection != null ? versions.find((v) => v.version === historySelection) : latest

  if (!latest) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Noch kein Dokument empfangen.
      </div>
    )
  }

  const previous = versions.find((v) => v.version === (selected?.version ?? 0) - 1)

  const latestTheme = AGENT_THEME[latest.agent as AgentId]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="flex items-center gap-2.5">
          <span
            key={latest.version}
            className={cn(
              "animate-in zoom-in-50 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow duration-300",
              latestTheme?.solid ?? "bg-slate-500"
            )}
          >
            v{latest.version}
          </span>
          <div>
            <div className="text-sm font-semibold">{latest.filename}</div>
            <div className="text-muted-foreground text-xs">
              zuletzt <span className={cn("font-medium", latestTheme?.text)}>{AGENT_LABEL[latest.agent] ?? latest.agent}</span> ·{" "}
              {formatTime(latest.occurredAt)}
            </div>
          </div>
        </div>
        <div className="flex gap-1 text-xs">
          {(["read", "changes", "history"] as Tab[]).map((t) => {
            const TabIcon = TAB_ICON[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                  tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <TabIcon className="size-3.5" />
                {t === "read" ? "Lesen" : t === "changes" ? "Änderungen" : "Verlauf"}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border p-3">
        {tab === "read" ? (
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected?.markdown ?? latest.markdown}</ReactMarkdown>
          </article>
        ) : null}

        {tab === "changes" ? (
          <div className="space-y-4">
            {!selected || selected.version === 1 ? (
              <p className="text-muted-foreground text-sm">Erstentwurf — keine vorherige Fassung zum Vergleich.</p>
            ) : selected.changes && selected.changes.length > 0 ? (
              selected.changes.map((change, i) => (
                <div key={i} className="space-y-1.5 border-b pb-3 last:border-b-0">
                  <InlineDiff before={change.vorher} after={change.nachher} />
                  <p className="text-muted-foreground text-xs italic">{change.begruendung}</p>
                </div>
              ))
            ) : previous ? (
              <InlineDiff before={previous.markdown} after={selected.markdown} />
            ) : (
              <p className="text-muted-foreground text-sm">Keine strukturierten Änderungen für diese Version verfügbar.</p>
            )}
          </div>
        ) : null}

        {tab === "history" ? (
          <ul className="space-y-1.5">
            {versions.map((v) => {
              const vTheme = AGENT_THEME[v.agent as AgentId]
              return (
              <li key={v.version}>
                <button
                  type="button"
                  onClick={() => {
                    setHistorySelection(v.version)
                    setTab("read")
                  }}
                  className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm"
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", vTheme?.solid ?? "bg-slate-500")}>
                    v{v.version}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("font-semibold", vTheme?.text)}>{AGENT_LABEL[v.agent] ?? v.agent}</span>
                    {v.summary ? <span className="text-muted-foreground"> · {v.summary}</span> : null}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatTime(v.occurredAt)}</span>
                </button>
              </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {historySelection != null && historySelection !== latest.version ? (
        <div className="bg-accent text-accent-foreground mt-2 flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
          <span>Ansicht: Version {historySelection} (nicht die aktuelle Fassung)</span>
          <button type="button" className="underline" onClick={() => setHistorySelection(null)}>
            Zur aktuellen Version
          </button>
        </div>
      ) : null}
    </div>
  )
}
