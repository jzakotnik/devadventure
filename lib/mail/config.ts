import type { AgentId } from "@/lib/events/types"

export type MailAccountConfig = {
  id: AgentId
  host: string
  port: number
  secure: boolean
  user: string
  password: string
}

export const ROLES: AgentId[] = ["PM", "BMZ", "PEA", "TEAMLEITUNG"]

/**
 * One IMAP mailbox per role, configured entirely through environment
 * variables — nothing here is hardcoded from the n8n setup. Expected vars
 * per role (e.g. for PM):
 *
 *   IMAP_PM_HOST=imap.example.com
 *   IMAP_PM_PORT=993          (optional, default 993)
 *   IMAP_PM_SECURE=true       (optional, default true; false uses STARTTLS)
 *   IMAP_PM_USER=projektmanager@example.com
 *   IMAP_PM_PASSWORD=...
 *
 * A role with any of HOST/USER/PASSWORD missing is simply left unconfigured.
 */
export function loadMailAccounts(): MailAccountConfig[] {
  const accounts: MailAccountConfig[] = []
  for (const role of ROLES) {
    const host = process.env[`IMAP_${role}_HOST`]
    const user = process.env[`IMAP_${role}_USER`]
    const password = process.env[`IMAP_${role}_PASSWORD`]
    if (!host || !user || !password) continue
    const port = Number(process.env[`IMAP_${role}_PORT`] ?? 993)
    const secure = (process.env[`IMAP_${role}_SECURE`] ?? "true").toLowerCase() !== "false"
    accounts.push({ id: role, host, port, secure, user, password })
  }
  return accounts
}

/** Maps each configured mailbox's own address back to its role — the only "who is who" knowledge this view uses. */
export function buildAddressDirectory(accounts: MailAccountConfig[]): Map<string, AgentId> {
  const map = new Map<string, AgentId>()
  for (const account of accounts) map.set(account.user.trim().toLowerCase(), account.id)
  return map
}
