import type { DocumentVersion } from "@/lib/events/derive"
import type { MailMessage } from "./types"

/** A new version is recorded only when the attached text actually differs from the last one seen. */
export function deriveDocumentVersionsFromMail(messages: MailMessage[]): DocumentVersion[] {
  const versions: DocumentVersion[] = []
  for (const m of messages) {
    if (!m.attachment) continue
    const last = versions.at(-1)
    if (last && last.markdown === m.attachment.text) continue

    const author = m.fromAgent ?? m.account
    versions.push({
      version: versions.length + 1,
      agent: author,
      markdown: m.attachment.text,
      filename: m.attachment.filename,
      occurredAt: m.receivedAt,
      summary: `${m.attachment.filename} per E-Mail von ${m.fromAgent ?? m.from} an ${m.account}`,
    })
  }
  return versions
}
