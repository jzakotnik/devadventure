import { NextResponse, type NextRequest } from "next/server"
import { publishEvent, clearBuffer } from "@/lib/events/bus"
import type { DemoEvent } from "@/lib/events/types"

export const dynamic = "force-dynamic"

/**
 * Replays a scripted sequence of events matching the KSN demo workflows, so
 * the dashboard can be exercised without n8n running. Not part of the
 * production event path.
 */

const RUN_ID = "KS-DEMO"
const DRAFT_V1 = `# Kurzstellungnahme zur Wasserversorgung Noria

## Projektdaten
Land: Noria | Sektor: Wasserversorgung

## 1. Foerdervorschlag
Ein Vorhaben zur Verbesserung der staedtischen Wasserversorgung wird vorgeschlagen. Der Finanzrahmen ist noch zu praezisieren.

## 2. Strategische Einordnung
Das Vorhaben ordnet sich in die laufende Zusammenarbeit im Wassersektor ein.

## 3. Problem- und Potentialanalyse
Ein erheblicher Teil der Bevoelkerung hat keinen zuverlaessigen Zugang zu sauberem Trinkwasser.

## 4. Gestaltung
Ziel, Zielgruppe, Massnahmen, Finanzierung, Risiken und Optionen sind zu praezisieren. Zustaendigkeiten fuer den Betrieb sind noch offen.

## 5. Bewertung und weiteres Vorgehen
Vorlaeufige Einschaetzung; weitere Abstimmung erforderlich.

## 6. Empfehlungen fuer den politischen Dialog
Noch offen.
`

const DRAFT_V2 = DRAFT_V1.replace(
  "Der Finanzrahmen ist noch zu praezisieren.",
  "Der Finanzrahmen betraegt voraussichtlich 12 Mio. EUR; die Finanzierungslücke beim laufenden Betrieb ist noch zu klaeren."
).replace(
  "Zustaendigkeiten fuer den Betrieb sind noch offen.",
  "Zustaendigkeiten fuer den Betrieb sind vor Umsetzungsbeginn mit der Durchfuehrungsorganisation zu klaeren."
)

const DRAFT_V3 = DRAFT_V2.replace(
  "Ein erheblicher Teil der Bevoelkerung hat keinen zuverlaessigen Zugang zu sauberem Trinkwasser.",
  "Ein erheblicher Teil der Bevoelkerung hat keinen zuverlaessigen Zugang zu sauberem Trinkwasser; lokale Umsetzungskapazitaeten sind gemaess Partnerrueckmeldung zu beruecksichtigen."
)

function buildScript(startedAt: number): { event: DemoEvent; delay: number }[] {
  let t = 0
  const at = (offsetMs: number) => new Date(startedAt + offsetMs).toISOString()

  const events: { event: DemoEvent; delay: number }[] = []
  const push = (partial: Omit<DemoEvent, "received_at" | "run_id" | "occurred_at">, delay: number) => {
    t += delay
    events.push({
      event: { run_id: RUN_ID, received_at: at(t), occurred_at: at(t), ...partial },
      delay: t,
    })
  }

  push(
    {
      event_id: `${RUN_ID}:pm:email-received:1`,
      type: "email.received",
      agent: "PM",
      case_id: RUN_ID,
      summary: "BMZ-Anfrage zur Wasserversorgung Noria eingegangen",
      email: { from: "bmz@youhadonejob.de", to: "projektmanager@youhadonejob.de", subject: "Kurzstellungnahme Wasserversorgung Noria" },
    },
    500
  )
  push({ event_id: `${RUN_ID}:pm:started:1`, type: "agent.started", agent: "PM", summary: "PM erstellt Erstentwurf" }, 2500)
  push(
    {
      event_id: `${RUN_ID}:pm:doc:1`,
      type: "document.revised",
      agent: "PM",
      summary: "Erstentwurf erstellt",
      document: { filename: "kurzstellungnahme.md", version: 1, markdown: DRAFT_V1 },
    },
    3000
  )
  push(
    {
      event_id: `${RUN_ID}:pm:sent:1`,
      type: "email.sent",
      agent: "PM",
      request_id: "ANF-1-BMZ-1",
      summary: "Review-Anfrage an BMZ gesendet",
      email: { from: "projektmanager@youhadonejob.de", to: "bmz@youhadonejob.de", subject: `[${RUN_ID}][ANF-1-BMZ-1] Kurzstellungnahme – BMZ-Review – v1` },
    },
    800
  )

  push({ event_id: `${RUN_ID}:bmz:received:1`, type: "email.received", agent: "BMZ", summary: "E-Mail von PM erhalten" }, 1500)
  push({ event_id: `${RUN_ID}:bmz:started:1`, type: "agent.started", agent: "BMZ", summary: "BMZ prueft Dokument" }, 3500)
  push(
    {
      event_id: `${RUN_ID}:bmz:doc:1`,
      type: "document.revised",
      agent: "BMZ",
      summary: "Finanzrahmen und Betriebszustaendigkeit praezisiert",
      document: {
        filename: "kurzstellungnahme.md",
        version: 2,
        markdown: DRAFT_V2,
        changes: [
          { vorher: "Der Finanzrahmen ist noch zu praezisieren.", nachher: "Der Finanzrahmen betraegt voraussichtlich 12 Mio. EUR; die Finanzierungslücke beim laufenden Betrieb ist noch zu klaeren.", begruendung: "Finanzrahmen und offene Betriebsfinanzierung transparent gemacht." },
          { vorher: "Zustaendigkeiten fuer den Betrieb sind noch offen.", nachher: "Zustaendigkeiten fuer den Betrieb sind vor Umsetzungsbeginn mit der Durchfuehrungsorganisation zu klaeren.", begruendung: "Klare Verantwortlichkeit fuer die Klaerung benannt." },
        ],
      },
    },
    4000
  )
  push({ event_id: `${RUN_ID}:bmz:review:1`, type: "review.decided", agent: "BMZ", summary: "Aenderungen angefordert", review: { ergebnis: "AENDERUNGEN", round: 1, round_limit: 3 } }, 500)
  push(
    {
      event_id: `${RUN_ID}:bmz:sent:1`,
      type: "email.sent",
      agent: "BMZ",
      summary: "Ueberarbeitete Fassung an PM gesendet",
      email: { from: "bmz@youhadonejob.de", to: "projektmanager@youhadonejob.de", subject: "AW: Kurzstellungnahme Wasserversorgung Noria" },
    },
    800
  )

  push({ event_id: `${RUN_ID}:pm:received:2`, type: "email.received", agent: "PM", summary: "BMZ-Rueckmeldung erhalten" }, 1500)
  push({ event_id: `${RUN_ID}:pm:started:2`, type: "agent.started", agent: "PM", summary: "PM prueft BMZ-Rueckmeldung" }, 2500)
  push({ event_id: `${RUN_ID}:pm:review:1`, type: "review.decided", agent: "PM", summary: "BMZ-Feedback eingearbeitet", review: { ergebnis: "AENDERUNGEN" } }, 500)
  push(
    {
      event_id: `${RUN_ID}:pm:sent:2`,
      type: "email.sent",
      agent: "PM",
      request_id: "ANF-1-PEA-1",
      summary: "Anfrage an PEA gesendet",
      email: { from: "projektmanager@youhadonejob.de", to: "pea@youhadonejob.de", subject: `[${RUN_ID}][ANF-1-PEA-1] Kurzstellungnahme – PEA-Review – v2` },
    },
    800
  )

  push({ event_id: `${RUN_ID}:pea:received:1`, type: "email.received", agent: "PEA", summary: "E-Mail von PM erhalten" }, 1200)
  push({ event_id: `${RUN_ID}:pea:started:1`, type: "agent.started", agent: "PEA", summary: "PEA prueft aus Partnersicht" }, 3200)
  push(
    {
      event_id: `${RUN_ID}:pea:doc:1`,
      type: "document.revised",
      agent: "PEA",
      summary: "Lokale Umsetzungskapazitaeten ergaenzt",
      document: {
        filename: "kurzstellungnahme.md",
        version: 3,
        markdown: DRAFT_V3,
        changes: [
          { vorher: "Ein erheblicher Teil der Bevoelkerung hat keinen zuverlaessigen Zugang zu sauberem Trinkwasser.", nachher: "Ein erheblicher Teil der Bevoelkerung hat keinen zuverlaessigen Zugang zu sauberem Trinkwasser; lokale Umsetzungskapazitaeten sind gemaess Partnerrueckmeldung zu beruecksichtigen.", begruendung: "Partnerperspektive zu Umsetzungskapazitaeten ergaenzt." },
        ],
      },
    },
    3000
  )
  push({ event_id: `${RUN_ID}:pea:review:1`, type: "review.decided", agent: "PEA", summary: "Partnerfeedback eingearbeitet", review: { ergebnis: "PARTNERFEEDBACK" } }, 500)
  push(
    {
      event_id: `${RUN_ID}:pea:sent:1`,
      type: "email.sent",
      agent: "PEA",
      summary: "Ueberarbeitete Fassung an PM gesendet",
      email: { from: "pea@youhadonejob.de", to: "projektmanager@youhadonejob.de", subject: "AW: Kurzstellungnahme Wasserversorgung Noria" },
    },
    800
  )

  push({ event_id: `${RUN_ID}:pm:received:3`, type: "email.received", agent: "PM", summary: "PEA-Rueckmeldung erhalten" }, 1500)
  push({ event_id: `${RUN_ID}:pm:started:3`, type: "agent.started", agent: "PM", summary: "PM bereitet Teamleitungsanfrage vor" }, 2200)
  push(
    {
      event_id: `${RUN_ID}:pm:sent:3`,
      type: "email.sent",
      agent: "PM",
      request_id: "ANF-1-TEAMLEITUNG-1",
      summary: "Anfrage an Teamleitung gesendet",
      email: { from: "projektmanager@youhadonejob.de", to: "teamleitung@youhadonejob.de", subject: `[${RUN_ID}][ANF-1-TEAMLEITUNG-1] Kurzstellungnahme – Teamleitung-Review – v3` },
    },
    800
  )

  push({ event_id: `${RUN_ID}:tl:received:1`, type: "email.received", agent: "TEAMLEITUNG", summary: "E-Mail von PM erhalten" }, 1200)
  push({ event_id: `${RUN_ID}:tl:started:1`, type: "agent.started", agent: "TEAMLEITUNG", summary: "Teamleitung prueft Fassung" }, 2800)
  push({ event_id: `${RUN_ID}:tl:review:1`, type: "review.decided", agent: "TEAMLEITUNG", summary: "Freigabe erteilt", review: { ergebnis: "GENEHMIGT" } }, 500)
  push(
    {
      event_id: `${RUN_ID}:tl:sent:1`,
      type: "email.sent",
      agent: "TEAMLEITUNG",
      summary: "Bestaetigung an PM gesendet",
      email: { from: "teamleitung@youhadonejob.de", to: "projektmanager@youhadonejob.de", subject: "AW: Kurzstellungnahme Wasserversorgung Noria" },
    },
    800
  )

  push({ event_id: `${RUN_ID}:pm:received:4`, type: "email.received", agent: "PM", summary: "Teamleitungs-Freigabe erhalten" }, 1200)
  push({ event_id: `${RUN_ID}:pm:started:4`, type: "agent.started", agent: "PM", summary: "PM erstellt Wirkungsmatrix" }, 2600)
  push(
    {
      event_id: `${RUN_ID}:pm:complete:1`,
      type: "run.completed",
      agent: "PM",
      summary: "Demo abgeschlossen mit ausdruecklicher Teamleitungsfreigabe",
      completion: { process_status: "completed", approval_status: "approved", approved_version: 3 },
    },
    600
  )

  return events
}

const globalForDemo = globalThis as unknown as { __demoTimers?: ReturnType<typeof setTimeout>[] }

export async function POST() {
  for (const timer of globalForDemo.__demoTimers ?? []) clearTimeout(timer)

  clearBuffer()
  const script = buildScript(Date.now())
  globalForDemo.__demoTimers = script.map(({ event, delay }) => setTimeout(() => publishEvent(event), delay))

  return NextResponse.json({ ok: true, scheduled: script.length, duration_ms: script.at(-1)?.delay ?? 0 })
}
