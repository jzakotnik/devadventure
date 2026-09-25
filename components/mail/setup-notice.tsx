import { cn } from "@/lib/utils"
import { AGENT_THEME } from "@/lib/events/agent-theme"
import type { AccountStatus } from "@/lib/mail/types"

export function SetupNotice({ statuses, compact = false }: { statuses: AccountStatus[]; compact?: boolean }) {
  const missing = statuses.filter((s) => !s.configured)
  if (!missing.length) return null

  return (
    <div className={cn("mx-auto max-w-2xl space-y-4 rounded-xl border-2 border-dashed p-6 text-sm", compact && "space-y-2 p-3")}>
      <h2 className="text-base font-bold">IMAP-Postfächer einrichten</h2>
      <p className="text-muted-foreground">
        Diese Ansicht liest ausschließlich echte E-Mails aus den vier Postfächern — keine n8n-internen Daten. Für
        jede fehlende Rolle müssen die folgenden Umgebungsvariablen gesetzt sein (z. B. in <code>.env.local</code>):
      </p>
      <div className="space-y-3">
        {missing.map((s) => {
          const theme = AGENT_THEME[s.id]
          return (
            <div key={s.id} className="rounded-lg border p-3">
              <div className={cn("mb-1 text-xs font-bold", theme.text)}>{theme.label}</div>
              <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                {`IMAP_${s.id}_HOST=imap.example.com
IMAP_${s.id}_PORT=993
IMAP_${s.id}_USER=...@example.com
IMAP_${s.id}_PASSWORD=...`}
              </pre>
            </div>
          )
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Zugriff ist ausschließlich lesend (die INBOX wird nur gelesen, keine Nachricht wird als gelesen markiert
        oder verändert). Ein App-Passwort statt des echten Postfach-Passworts wird empfohlen.
      </p>
    </div>
  )
}
