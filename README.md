# KSN Demo Control Room

A live-only dashboard for the PM / BMZ / PEA / Teamleitung agent demo. No database:
n8n stays the orchestrator, this app just observes and displays. Events live in an
in-memory ring buffer inside one long-running Next.js process and are pushed to
browsers over Server-Sent Events.

Three views, switchable from the header:

- **`/`** — the full control room: process bar, agent cards, activity feed, document
  versions/diff, decision cards. Driven by the n8n event stream (see "Wiring up n8n").
- **`/simple`** — a presentation-friendly map of the four actors with animated email
  flights, click-to-inspect. Same event stream as `/`.
- **`/mail`** — a third, independent view driven **only** by the four real IMAP
  mailboxes, not n8n events. See "Email-only view" below.

## Running it

```bash
npm install
npm run dev        # or: npm run build && npm start
```

Open `http://localhost:3000`. Click **"Demo abspielen"** to replay a scripted run
of the whole PM→BMZ→PEA→Teamleitung flow without needing n8n running — useful for
rehearsing the presentation.

**Important**: deploy this as a single long-lived Node process (`next start`, one
instance). The event buffer lives in process memory; a serverless/edge deployment
would split the `POST /api/events` and the SSE connection across instances that
never see each other.

Optional: set `DEMO_EVENTS_SECRET` in the environment to require a shared secret
on writes (`x-demo-secret` header). Without it, the endpoint is open — fine for a
LAN demo, not for the public internet.

## Wiring up n8n

Each of the four workflows needs a few `HTTP Request` nodes added around the
existing logic. None of them should be able to stall the email demo: set a short
timeout (2–3s) and `"Continue On Fail"` on every one of these nodes, wired to
nowhere on failure — a missed dashboard update should never block a real
send/receive.

**Endpoint**: `POST {DASHBOARD_URL}/api/events`
**Headers**: `Content-Type: application/json`, `x-demo-secret: {DEMO_EVENTS_SECRET}` (if set)

### Event shape

```json
{
  "event_id": "KS-12345:bmz:doc:1",
  "run_id": "KS-12345",
  "type": "document.revised",
  "agent": "BMZ",
  "occurred_at": "2026-09-24T14:33:12.000Z",
  "request_id": "ANF-23736-BMZ-2",
  "summary": "Finanzrahmen und Betriebszuständigkeit präzisiert",
  "document": {
    "filename": "kurzstellungnahme.md",
    "version": 4,
    "markdown": "# Kurzstellungnahme\n\n...",
    "changes": [
      { "vorher": "...", "nachher": "...", "begruendung": "..." }
    ]
  }
}
```

`event_id` must be **stable and deterministic** (e.g. `` `${executionId}:${node}:${n}` ``)
so a retried node never double-counts. All other top-level fields
(`email`, `review`, `completion`, `error`) are optional — include whichever apply
to that event. Types are in `lib/events/types.ts`.

### BMZ / PEA workflows

Both follow the same shape. Add nodes:

1. **After "Anhang lesen"**, before the LLM chain — `agent.started`:
   ```json
   { "event_id": "={{$execution.id}}:bmz:started:1", "run_id": "={{$json.absender_adresse}}", "type": "agent.started", "agent": "BMZ", "occurred_at": "={{$now.toISO()}}", "summary": "BMZ prüft die Kurzstellungnahme" }
   ```
   (use the actual run/case id you track — see "Run IDs" below)

2. **After "Änderungen anwenden und Anhang erstellen"**, before SMTP — `document.revised`:
   ```json
   {
     "event_id": "={{$execution.id}}:bmz:doc:1",
     "run_id": "...",
     "type": "document.revised",
     "agent": "BMZ",
     "occurred_at": "={{$now.toISO()}}",
     "summary": "={{$json.anzahl_aenderungen}} Änderungen angewendet",
     "document": {
       "filename": "={{$json.dateiname}}",
       "changes": "={{$json.aenderungen}}"
     }
   }
   ```
   Note `version` is omitted here deliberately — BMZ/PEA don't know the PM's
   version counter; the dashboard just needs the change list. If you want exact
   version numbers, have PM's workflow be the sole `document.revised` publisher
   with `version` set, and drop this event or keep it as `review.decided` only.

3. **After SMTP send** ("Antwort senden und Update Anhang") — `email.sent`:
   ```json
   { "event_id": "={{$execution.id}}:bmz:sent:1", "run_id": "...", "type": "email.sent", "agent": "BMZ", "occurred_at": "={{$now.toISO()}}", "email": { "from": "={{$json.absender_adresse}}", "to": "={{$json.empfaenger_adresse}}", "subject": "={{$json.antwort_betreff}}" } }
   ```

### Teamleitung workflow

Same pattern, plus a `review.decided` event right after "Dokument lesen und
Entscheidung auslosen" (it already computes `entscheidung`):
```json
{
  "event_id": "={{$execution.id}}:tl:review:1",
  "run_id": "...",
  "type": "review.decided",
  "agent": "TEAMLEITUNG",
  "occurred_at": "={{$now.toISO()}}",
  "review": { "ergebnis": "={{$json.entscheidung}}" }
}
```
The dashboard already renders `GENEHMIGT` as a demo coin-flip decision, not a
real approval — no extra labeling needed on the n8n side.

### PM workflow (the important one — it has the actual state)

PM's `Demo fortführen V4` code node already computes everything the dashboard
needs (`row`, `send`, `target`, round numbers, `wesentliche_aenderung`,
`teamleitung_ok_version`). Add HTTP Request nodes at these points:

1. **After "E-Mail lesen"** — `email.received`
2. **After "PM-Auftrag DEMO V4"**, before the LLM chain — `agent.started`
3. **After "Demo fortführen V4"** — branch on what happened:
   - if a new document version was produced → `document.revised` with
     `document.version = {{$json.row.dokument_version}}`
   - always → `review.decided` with `review.ergebnis` from the PM's own
     enum (`ENTWURF`/`OK`/`AENDERUNGEN`/`PARTNERFEEDBACK`/`UNKLAR`) and
     `review.round_exhausted` when `fehlerhinweis` was just appended for a
     limit-exhaustion
4. **After "PM sendet Review-Anfrage"** — `email.sent`
5. **After "Demo-Ergebnis V4"**, only when `row.status === 'ABGESCHLOSSEN'` —
   `run.completed`:
   ```json
   {
     "event_id": "={{$execution.id}}:pm:complete:1",
     "run_id": "={{$json.vorgang_id}}",
     "type": "run.completed",
     "agent": "PM",
     "occurred_at": "={{$now.toISO()}}",
     "completion": {
       "process_status": "completed",
       "approval_status": "={{$json.teamleitung_ok_version ? 'approved' : 'not_granted'}}",
       "approved_version": "={{$json.teamleitung_ok_version}}"
     }
   }
   ```
   This is the field the dashboard uses to distinguish a real Teamleitung
   sign-off from a demo continuation after the review limit — PM's own table
   already tracks it (`teamleitung_ok_version: null` when not approved), so
   this is a direct pass-through, not a new judgment call.

### Run IDs

Use PM's `vorgang_id` (e.g. `KS-A1B2C3D4`) as `run_id` everywhere — BMZ/PEA/
Teamleitung don't currently see it (they only get the case/request IDs in the
email subject `[KS-…][ANF-…]`), so parse it out of the subject the same way PM
does, or simplest: add an `n8n-nodes-base.set` node right after "Anhang lesen" /
"Dokument lesen…" that extracts `mail.subject.match(/\[(KS-[^\]]+)\]/)?.[1]` and
reuses it as `run_id` in the event payload.

## Email-only view (`/mail`)

A third view that ignores n8n entirely and shows only what four real IMAP
mailboxes actually contain — from/to/subject/body, and the `kurzstellungnahme.md`
attachment where present. No execution IDs, no `vorgang_id`/`anfrage_id`, no
round-counting: just "who emailed whom, and what was attached," the way a human
reading four inboxes would see it. Useful as an independent sanity check against
the n8n-driven views, or as a lighter-weight demo that needs no n8n instrumentation
at all — only working IMAP credentials for the four mailboxes.

### Setup

Set these environment variables (e.g. in `.env.local`) for each of the four roles
you want to show — a role with any of HOST/USER/PASSWORD missing is simply left
"not configured" in the UI rather than breaking the page:

```bash
IMAP_PM_HOST=imap.example.com
IMAP_PM_PORT=993              # optional, default 993
IMAP_PM_SECURE=true           # optional, default true; false uses STARTTLS
IMAP_PM_USER=projektmanager@example.com
IMAP_PM_PASSWORD=...

IMAP_BMZ_HOST=...
IMAP_BMZ_USER=...
IMAP_BMZ_PASSWORD=...

IMAP_PEA_HOST=...
IMAP_PEA_USER=...
IMAP_PEA_PASSWORD=...

IMAP_TEAMLEITUNG_HOST=...
IMAP_TEAMLEITUNG_USER=...
IMAP_TEAMLEITUNG_PASSWORD=...
```

An app password is strongly recommended over the mailbox's real password.

### How it works

- `lib/mail/store.ts` opens one `ImapFlow` connection per configured mailbox,
  **read-only** (`mailboxOpen('INBOX', { readOnly: true })`) — it never sets
  `\Seen` or any other flag, so it's safe to run alongside n8n's own IMAP trigger
  nodes on the same mailboxes. It only looks at mail that arrives *after* it
  connects (baseline = `uidNext` at connect time); it does not replay or alter
  anything already in the inbox.
- New mail is detected via IMAP IDLE (`ImapFlow`'s automatic idle, triggered by
  its `exists` event) — no polling loop. On disconnect it reconnects with a 5s
  backoff.
- Each message is parsed with `mailparser` to get from/to/subject/body, and any
  `.md`/`.markdown`/`.txt` attachment (capped at 200KB) is kept as the document
  text.
- **The only "who is who" knowledge this view uses** is built at runtime from the
  four configured mailbox addresses themselves (`lib/mail/config.ts`'s
  `buildAddressDirectory`) — not from any hardcoded n8n domain or convention.
  Whoever the mailbox owner emails becomes a labeled actor; anyone else shows up
  as a plain, unlabeled address.
- Document versions for the `/mail` document panel are derived by watching
  attachment text change across messages (`lib/mail/derive.ts`) — a new version
  is only recorded when the attached text actually differs from the last one
  seen, same principle as the n8n-driven views.
- `GET /api/mail/status` reports which of the four mailboxes are configured and
  connected (never the credentials); `GET /api/mail/stream` is the SSE feed the
  page subscribes to.

## Architecture notes

- `lib/events/bus.ts` — process-local pub/sub + bounded ring buffer (500 events
  / 8MB, oldest dropped first). Duplicate `event_id`s are ignored.
- `app/api/events/route.ts` — `POST` (n8n → dashboard), `GET` (debug: current
  buffer), `DELETE` (clear, for rehearsal resets).
- `app/api/events/stream/route.ts` — SSE endpoint the browser subscribes to;
  sends the current buffer as a `backlog` event, then live events, with a
  15s heartbeat.
- `app/api/events/demo/route.ts` — scripted replay for rehearsing without n8n.
  Not part of the production event path.
- Document versions, agent status, decisions, and the email list are all
  **derived client-side** from the event stream (`lib/events/derive.ts`) — no
  separate state machine to keep in sync.
