/**
 * Prompt for generating a game file with an AI assistant. It states the
 * rules the validator enforces and includes a working game as the example.
 */

const RULES = `Du erstellst eine Spieldatei (JSON) für „devadventure“: ein Browserspiel, in dem man als Trainee ein Dokument durch ein Bürogebäude zu verschiedenen Personen bringt und dabei einen Geschäftsprozess lernt. Jede Antwort im Gespräch bringt Punkte; falsche Antworten schicken den Spieler zurück (kostet eine Überarbeitungsrunde) und erklären auf einer Lernkarte, warum der Prozess so funktioniert.

AUSGABE
- Antworte NUR mit dem vollständigen JSON-Objekt. Kein Markdown, keine Code-Zäune, keine Erklärung.
- Sprache: Deutsch (Figuren, Texte, Lernkarten). Schlüsselnamen und ids bleiben wie im Beispiel (ASCII, ohne Leerzeichen).
- Orientiere dich im Aufbau, in der Textlänge und im Ton am Beispielspiel unten.

STRUKTUR (alle Schlüssel des Beispiels beibehalten)
- id, title, subtitle, intro[] (3 Absätze), disclaimer[] (falls im Beispiel vorhanden: unverändert übernehmen), roundLimit (2–4), firstStage, pipeline[], texts, map, rooms[], npcs{}, stages[], dialogs{}, eventSettings, events[], achievements[], ambient; optional scoring, ui, debrief.
- map, rooms[].rect, npcs[*].at/facing/look und ambient (Plan, Positionen, Aussehen, laufende Kollegen) unverändert aus dem Beispiel übernehmen. Ändere bei den sechs Räumen nur id und label, bei den Figuren name, title, room und ggf. role.
- Genau sechs Räume und sechs Figuren, je eine Figur pro Raum. Mindestens eine Figur hat role "hint" (verkauft Tipps), mindestens eine role "fact" (nennt Fakten). Typisch stehen sie im Pausenraum (Raum 4) bzw. im Archiv (Raum 6); sie können aber auch zugleich Gesprächspartner einer Phase sein. Die übrigen Figuren sind die Stationen des Prozesses.

PHASEN (stages[])
- Jede Phase: id, title, room, npc (Figur dieses Raums), objective, hint, fact, dialog, optional repeatDialog (Einstieg bei erneutem Besuch), on.
- Die erste Phase (firstStage) holt das Dokument ab: ihre Wirkung hat giveDoc: true und docVersion: 1.
- Nach einer Ablehnung geht es in eine Nacharbeits-Phase (z. B. beim Assistenten im ersten Raum) und von dort zurück in die Prüf-Phase.
- on: Ergebnis-Schlüssel (z. B. OK, UNKLAR, AENDERUNGEN, DONE) → Wirkung oder Liste von Wirkungen. Wirkung: next (Phase; weglassen = bleibt in der Phase), costsRound (true = kostet eine Runde), docVersion, giveDoc, score, ending ("success" oder "failed"), message, tone ("good", "bad", "info"), when.
- Bedingte Verzweigung: on kann eine Liste sein; die erste Wirkung, deren when zutrifft (oder die keins hat), gilt. when: { "flag": "name" } (oder scoreAtLeast, roundsAtLeast usw.).
- Genau eine Phase beendet das Spiel mit ending: "success", und sie muss erreichbar sein.
- Jede Phase kommt in genau einem Schritt von pipeline[] vor (auch Nacharbeits-Phasen).

DIALOGE (dialogs{})
- Knoten: id → { text, choices[] } mit 1 bis 4 Antworten, oder ohne Antworten mit next (nächster Knoten) bzw. result.
- Antwort: text, reply (Reaktion der Figur), learn (Lernkarte „Warum so?“), score (gut +, schlecht −), und entweder result oder goto (weiter mit Knoten); optional flag (merkt sich eine Markierung) und round.
- Jedes result, das ein Dialog liefern kann, muss in on der Phase stehen, die diesen Dialog benutzt.
- Jede Markierung in when oder in einer Erfolgs-Regel muss von mindestens einer Antwort (flag) gesetzt werden.

DIDAKTIK
- Der Spieler ist Trainee und läuft zwischen den Personen hin und her; er hat keine Entscheidungsbefugnis (kein „als Abteilungsleiter“, kein Zeichnungsrecht).
- Jede falsche Antwort hat eine learn-Karte mit der Regel dahinter. Fachlich richtig bleiben; keine erfundenen Paragraphen oder Zahlen.
- Nacharbeits- und Wiederholungs-Dialoge geben wenig Punkte (+2), damit ein Umweg nie mehr Punkte bringt als ein sauberer Durchlauf.
- Mindestens zwei bedingte Verzweigungen (when/flag), die zurückschicken, wenn der Spieler früher etwas ausgelassen hat.
- events[]: 4–6 Zufallsereignisse mit 2–3 Antworten (ohne result), davon mindestens zwei prozessspezifische; achievements[]: 10–14 Erfolge mit gültigen Regeln (Markierungen aus den Antworten verwenden).
- texts.wrongNpc enthält {room}, texts.hintPrefix enthält {n}.

PRÜFUNG VOR DER ANTWORT
Gehe die Regeln durch: alle Verweise (room, npc, dialog, goto, next) existieren; alle Ergebnisse sind in on behandelt; die Karte bleibt unverändert; das JSON ist syntaktisch gültig.`

export function buildAiPrompt(example: unknown, topic: string): string {
  const task = topic.trim()
    ? `AUFGABE\nErstelle ein neues Spiel zu diesem Prozess: ${topic.trim()}\n`
    : `AUFGABE\nErstelle ein neues Spiel zu einem typischen Unternehmensprozess deiner Wahl (nenne ihn im Titel).\n`
  return `${RULES}\n\n${task}\nBEISPIELSPIEL (gültig, dient als Vorlage für Aufbau und Ton)\n${JSON.stringify(example, null, 1)}\n`
}
