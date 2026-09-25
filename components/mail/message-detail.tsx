import { X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { MailMessage } from "@/lib/mail/types"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import { Button } from "@/components/ui/button"

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })
}

export function MessageDetail({ message, onClose }: { message: MailMessage; onClose: () => void }) {
  const theme = message.fromAgent ? AGENT_THEME[message.fromAgent] : undefined

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={cn("flex items-start justify-between gap-2 rounded-lg border-2 p-3", theme?.soft ?? "bg-muted")}>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{message.subject}</div>
          <div className={cn("truncate text-xs font-medium", theme?.text ?? "text-muted-foreground")}>
            {message.from} → {message.to.join(", ") || "?"}
          </div>
          <div className="text-muted-foreground text-xs">{formatTime(message.date)}</div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <p className="text-sm whitespace-pre-wrap">{message.text || "(kein Text)"}</p>
        {message.attachment ? (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold">
              Anhang: {message.attachment.filename}
              {message.attachment.truncated ? " (gekürzt)" : ""}
            </div>
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.attachment.text}</ReactMarkdown>
            </article>
          </div>
        ) : null}
      </div>
    </div>
  )
}
