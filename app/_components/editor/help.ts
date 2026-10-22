/**
 * Explanations for the editor: a German label and a short "what do I enter
 * here" text for every field, looked up by the field's position in the game
 * (indices and user-defined ids are written as "*").
 */

export type Path = Array<string | number>

interface Meta {
  label?: string
  help?: string
}

const H = (label: string, help: string): Meta => ({ label, help })

const RULE: Record<string, Meta> = {
  stat: H(
    "Zähler",
    "Welcher Zähler geprüft wird: talks (Gespräche), steps (Schritte), hints (gekaufte Tipps), facts (gehörte Fakten), events / eventsGood / eventsBad (Ereignisse gesamt / gut / schlecht gelöst), wrongVisits (falsche Gesprächspartner), rooms (besuchte Räume)."
  ),
  gte: H(
    "mindestens",
    "Mindestwert des Zählers (z. B. 3 = „mindestens dreimal“)."
  ),
  statAtMost: H(
    "Obergrenzen",
    "Zähler, die einen Höchstwert nicht überschreiten dürfen, z. B. hints = 0 für „ohne Tipps“. Nur im JSON-Tab bearbeitbar."
  ),
  finished: H(
    "Spielende",
    "Gilt nur, wenn das Spiel so geendet hat: success (Erfolg) oder failed (Scheitern)."
  ),
  roundsAtMost: H(
    "Runden höchstens",
    "Höchstens so viele Überarbeitungsrunden (0 = fehlerfrei)."
  ),
  roundsAtLeast: H(
    "Runden mindestens",
    "Mindestens so viele Überarbeitungsrunden."
  ),
  scoreAtLeast: H("Punkte mindestens", "Mindestpunktzahl."),
  scoreAtMost: H("Punkte höchstens", "Höchstpunktzahl."),
  flag: H(
    "Markierung",
    "Name einer Markierung, die vorher durch eine Antwort oder ein Ereignis gesetzt wurde (Feld „flag“ bei einer Antwort)."
  ),
  roomsVisited: H(
    "besuchte Räume",
    "So viele verschiedene Räume muss der Spieler betreten haben."
  ),
}

const LOOK: Record<string, Meta> = {
  shirt: H("Oberteil", "Farbe des Oberteils."),
  pants: H("Hose", "Farbe der Hose."),
  hair: H("Haare", "Haarfarbe."),
  skin: H("Hautfarbe", "Hautfarbe."),
  accessory: H(
    "Accessoire",
    "Optional: glasses (Brille), tie (Krawatte), bow (Schleife) oder cap (Mütze)."
  ),
}

const CHOICE: Record<string, Meta> = {
  text: H(
    "Antwort",
    "Was der Spieler antwortet – so steht es auf der Auswahl-Schaltfläche."
  ),
  reply: H(
    "Reaktion der Figur",
    "Optional: Was die Figur direkt nach dieser Antwort sagt."
  ),
  learn: H(
    "Lernkarte „Warum so?“",
    "Optional: Erklärt, warum diese Antwort gut oder schlecht war. Wird im Spiel gezeigt und im Protokoll am Ende wiederholt."
  ),
  score: H(
    "Punkte",
    "Punkte für diese Antwort. Positiv = Belohnung, negativ = Abzug."
  ),
  result: H(
    "Ergebnis",
    "Ergebnis-Schlüssel, z. B. OK oder UNKLAR. Er muss in der Phase unter „on“ vorkommen (Tab „Ablauf“) und bestimmt, wie es weitergeht."
  ),
  goto: H(
    "Weiter mit Knoten",
    "Statt eines Ergebnisses: Das Gespräch mit diesem Gesprächsknoten fortsetzen."
  ),
  round: H(
    "Runden ±",
    "Verändert die Zahl der Überarbeitungsrunden (z. B. 1 oder −1). Meist nur bei Ereignissen sinnvoll."
  ),
  flag: H(
    "Markierung setzen",
    "Merkt sich eine Markierung (Name frei wählbar), die später in Bedingungen und Erfolgen abgefragt werden kann."
  ),
}

const EFFECT: Record<string, Meta> = {
  next: H(
    "Nächste Phase",
    "Phase, zu der es weitergeht. Leer lassen: Der Spieler bleibt in dieser Phase."
  ),
  costsRound: H(
    "kostet eine Runde",
    "Angehakt = zählt als Überarbeitungsrunde (Rundenlimit!)."
  ),
  docVersion: H(
    "Dokument-Version +",
    "Um wie viel die Version des Dokuments steigt (meist 1 nach einer Überarbeitung)."
  ),
  giveDoc: H(
    "Dokument erhalten",
    "Angehakt = der Spieler bekommt hier das Dokument (Anzeige im HUD)."
  ),
  score: H(
    "Punkte",
    "Zusätzliche Punkte für dieses Ergebnis (negativ = Abzug)."
  ),
  ending: H(
    "Spielende",
    "Beendet das Spiel: success = Erfolg, failed = Scheitern. Leer lassen = Spiel läuft weiter."
  ),
  message: H(
    "Meldung",
    "Kurze Einblendung für den Spieler, z. B. „Freigabe erhalten! Weiter zur Teamleitung.“"
  ),
  tone: H(
    "Stimmung der Meldung",
    "good = grün/positiv, bad = rot/negativ, info = neutral. Steuert auch den Klang."
  ),
}

const UI: Record<string, string> = {
  objective: "Beschriftung des Auftrags oben links (Standard „ZIEL“).",
  score: "Beschriftung der Punkteanzeige.",
  rounds: "Beschriftung der Rundenanzeige.",
  achievements: "Beschriftung für die Erfolge.",
  document:
    "Name des Dokuments in der Anzeige rechts oben, z. B. „ANTRAG“. Leer lassen blendet die Anzeige aus.",
  muteOn: "Text der Ton-Schaltfläche, solange der Ton an ist.",
  muteOff: "Text der Ton-Schaltfläche, solange der Ton aus ist.",
  next: "Text der „Weiter“-Schaltfläche im Gespräch.",
  start: "Text der Start-Schaltfläche auf dem Titelbildschirm.",
  restart: "Text der Schaltfläche für ein neues Spiel am Ende.",
  bestScore: "Anzeige des Bestwerts; {n} wird durch die Punktzahl ersetzt.",
  hintHelp: "Steuerungshinweis zu Spielbeginn.",
  titleKeys: "Steuerungshinweis auf dem Titelbildschirm.",
  factBonus:
    "Zusatz hinter einem Fakt; {n} wird durch die Bonuspunkte ersetzt.",
  learnLabel: "Überschrift der Lernkarte (Standard „Warum so?“).",
  unlockedHead: "Überschrift der Erfolgs-Meldung.",
  decisions: "Überschrift des Entscheidungs-Protokolls am Ende.",
  runAchievements: "Überschrift der in dieser Runde erreichten Erfolge.",
  allAchievements: "Text der Schaltfläche für alle Erfolge.",
  back: "Text der Zurück-Schaltfläche.",
  loadError: "Überschrift, wenn ein Spiel nicht geladen werden kann.",
  menu: "Text der Schaltfläche zurück zum Menü.",
  disclaimerLabel:
    "Überschrift des Hinweises auf dem Titelbildschirm (Standard „Hinweis“).",
}

const MAP: Record<string, Meta> = {
  // general
  title: H(
    "Name des Spiels",
    "Erscheint auf dem Titelbildschirm und im Menü, z. B. „URLAUBS QUEST“."
  ),
  subtitle: H(
    "Untertitel",
    "Ein Satz unter dem Namen: Worum geht es im Prozess?"
  ),
  intro: H(
    "Einführung",
    "Texte auf dem Titelbildschirm. Jeder Eintrag ist ein Absatz: Worum geht es, was ist das Ziel?"
  ),
  "intro.*": H("Absatz", "Ein Absatz der Einführung."),
  disclaimer: H(
    "Hinweis (Disclaimer)",
    "Kleingedruckter Hinweis unten auf dem Titelbildschirm, z. B. zu Quellen, erfundenen Figuren und Haftung. Ein Eintrag pro Zeile. Ohne Einträge erscheint kein Hinweis."
  ),
  "disclaimer.*": H("Zeile", "Eine Zeile des Hinweises."),
  roundLimit: H(
    "Rundenlimit",
    "Wie viele Überarbeitungsrunden erlaubt sind. Wird die Zahl überschritten, endet das Spiel ohne Erfolg. Üblich: 2–4."
  ),
  firstStage: H(
    "Startphase",
    "Phase, mit der das Spiel beginnt (siehe Tab „Ablauf“)."
  ),
  texts: H(
    "Texte",
    "Feste Sätze des Spiels, die keiner Figur oder Phase zugeordnet sind."
  ),
  "texts.wrongNpc": H(
    "Falsche Figur",
    "Das sagt eine Figur, die gerade nicht zuständig ist. {room} wird durch den Raum ersetzt, in den der Spieler gehen soll."
  ),
  "texts.hintPrefix": H(
    "Tipp-Einleitung",
    "Satzanfang vor einem gekauften Tipp. {n} wird durch die Punktkosten ersetzt."
  ),
  "texts.factPrefix": H(
    "Fakt-Einleitung",
    "Satzanfang vor einem Fakt, z. B. „Wusstest du? “."
  ),
  "texts.successTitle": H(
    "Erfolg: Überschrift",
    "Große Überschrift am Ende, wenn der Prozess erfolgreich war."
  ),
  "texts.successText": H(
    "Erfolg: Text",
    "Erklärung unter der Überschrift bei Erfolg."
  ),
  "texts.failedTitle": H(
    "Scheitern: Überschrift",
    "Große Überschrift am Ende, wenn das Spiel scheitert (z. B. Rundenlimit überschritten)."
  ),
  "texts.failedText": H(
    "Scheitern: Text",
    "Erklärung unter der Überschrift bei Scheitern."
  ),
  pipeline: H(
    "Fortschrittsleiste",
    "Die Leiste links oben im Spiel. Jeder Eintrag ist ein großer Prozessschritt aus einer oder mehreren Phasen."
  ),
  "pipeline.*": H("Prozessschritt", "Ein Schritt der Fortschrittsleiste."),
  "pipeline.*.label": H(
    "Beschriftung",
    "Kurzer Name des Schritts in der Leiste, z. B. „Teamleitung“."
  ),
  "pipeline.*.stages": H(
    "Zugehörige Phasen",
    "Phasen dieses Schritts. Der Schritt leuchtet auf, solange eine davon aktiv ist."
  ),
  "pipeline.*.stages.*": H(
    "Phase",
    "Eine Phase aus dem Tab „Ablauf“ auswählen."
  ),

  // world
  map: H(
    "Karte",
    "Das Gebäude als Zeichenraster und die Startposition des Spielers."
  ),
  "map.layout": H(
    "Gebäudeplan",
    "Eine Zeile pro Reihe. Zeichen: # Wand · _ Raumboden · . Flur · + Tür · d Schreibtisch · s Regal · p Pflanze · c Kaffeemaschine · r Drucker · t Tisch. Alle Zeilen müssen gleich lang sein."
  ),
  "map.layout.*": H(
    "Zeile",
    "Eine Reihe des Plans; muss genauso lang sein wie die übrigen."
  ),
  "map.start": H(
    "Startfeld",
    "Wo der Spieler beginnt: [Spalte, Zeile], von 0 gezählt. Das Feld muss begehbar sein."
  ),
  rooms: H(
    "Räume",
    "Farbige Bereiche der Karte. Figuren und Phasen verweisen auf einen Raum."
  ),
  "rooms.*": H("Raum", "Ein Raum der Karte."),
  "rooms.*.id": H(
    "Interner Name",
    "Kurzer Name ohne Leerzeichen. Figuren und Phasen verweisen darauf – eine Änderung bricht diese Verweise."
  ),
  "rooms.*.label": H(
    "Türschild",
    "Name des Raums, wie er im Spiel angezeigt wird."
  ),
  "rooms.*.color": H("Bodenfarbe", "Farbe des Raumbodens."),
  "rooms.*.rect": H(
    "Lage und Größe",
    "[x, y, Breite, Höhe] in Kacheln; muss zum Plan passen."
  ),
  ambient: H(
    "Laufende Kollegen",
    "Kollegen, die durchs Gebäude laufen und den Spieler grüßen. Nur Atmosphäre, sie stören den Ablauf nie."
  ),
  "ambient.greetDistance": H(
    "Grußabstand",
    "Ab wie vielen Kacheln Abstand ein Kollege grüßt."
  ),
  "ambient.cooldownSec": H(
    "Grußpause",
    "Sekunden, bis derselbe Kollege wieder grüßt."
  ),
  "ambient.bubbleSec": H(
    "Anzeigedauer",
    "Wie lange die Sprechblase sichtbar bleibt (Sekunden)."
  ),
  "ambient.lines": H(
    "Grußsätze",
    "Mögliche Sätze, die Kollegen im Vorbeigehen sagen; einer wird zufällig gewählt."
  ),
  "ambient.lines.*": H("Grußsatz", "Ein kurzer Satz im Vorbeigehen."),
  "ambient.wanderers": H("Kollegen", "Die Figuren, die herumlaufen."),
  "ambient.wanderers.*": H("Kollege", "Eine laufende Figur."),
  "ambient.wanderers.*.id": H(
    "Interner Name",
    "Eindeutiger Name ohne Leerzeichen."
  ),
  "ambient.wanderers.*.name": H("Name", "Name der Figur."),
  "ambient.wanderers.*.start": H(
    "Startfeld",
    "[Spalte, Zeile], von wo aus sie losläuft; muss begehbar sein."
  ),
  "ambient.wanderers.*.look": H("Aussehen", "Farben und Accessoire der Figur."),

  // actors
  npcs: H(
    "Akteure",
    "Alle sprechenden Figuren. Jede steht in einem Raum auf einem festen Feld und wird in den Phasen als Gesprächspartner eingesetzt."
  ),
  "npcs.*": H("Figur", "Eine sprechende Figur."),
  "npcs.*.name": H("Name", "Name im Dialogfenster, z. B. „Frau Meier“."),
  "npcs.*.title": H("Funktion", "Rolle oder Abteilung, z. B. „Teamleiterin“."),
  "npcs.*.room": H("Raum", "Raum, in dem die Figur steht."),
  "npcs.*.at": H(
    "Standort",
    "[Spalte, Zeile] der Figur. Muss im gewählten Raum liegen und begehbar sein."
  ),
  "npcs.*.facing": H("Blickrichtung", "Wohin die Figur schaut."),
  "npcs.*.role": H(
    "Sonderrolle",
    "Optional. hint: verkauft gegen Punktabzug einen Tipp zur aktuellen Phase. fact: erzählt einmal pro Phase einen Fakt (Bonuspunkte). Ohne Rolle spricht die Figur nur in ihrer eigenen Phase."
  ),
  "npcs.*.look": H("Aussehen", "Farben und Accessoire der Figur."),

  // flow
  stages: H(
    "Phasen",
    "Die Schritte des Prozesses. Jede Phase ist ein Gespräch mit einer Figur in einem Raum. Wie es danach weitergeht, steht unter „on“."
  ),
  "stages.*": H("Phase", "Eine Phase des Prozesses."),
  "stages.*.id": H(
    "Interner Name",
    "Eindeutiger Name ohne Leerzeichen. „Nächste Phase“, Startphase und Fortschrittsleiste verweisen darauf."
  ),
  "stages.*.title": H(
    "Titel",
    "Anzeigename der Phase, auch im Protokoll am Ende."
  ),
  "stages.*.room": H("Raum", "Raum, in den der Spieler gehen soll."),
  "stages.*.npc": H(
    "Gesprächspartner",
    "Figur, mit der der Spieler in dieser Phase sprechen muss."
  ),
  "stages.*.objective": H(
    "Auftrag",
    "Steht im Spiel oben links als ZIEL. Als Handlungsaufforderung formulieren, z. B. „Hole die Unterschrift von Frau Meier.“"
  ),
  "stages.*.hint": H(
    "Tipp",
    "Text, den die Tipp-Figur nennt (kostet Punkte). Ein Anstoß, was der Spieler in dieser Phase tun sollte."
  ),
  "stages.*.fact": H(
    "Fakt",
    "Text, den die Fakt-Figur nennt (gibt Bonuspunkte): Hintergrundwissen zu dieser Phase."
  ),
  "stages.*.dialog": H(
    "Gespräch (erster Besuch)",
    "Gesprächsknoten, mit dem das Gespräch beginnt (siehe Tab „Dialoge“)."
  ),
  "stages.*.repeatDialog": H(
    "Gespräch (erneuter Besuch)",
    "Optional: anderer Einstieg, wenn der Spieler wiederkommt, z. B. nach einer Überarbeitung."
  ),
  "stages.*.on": H(
    "Ergebnisse",
    "Was passiert, wenn ein Gespräch mit einem bestimmten Ergebnis endet. Links steht der Ergebnis-Schlüssel (so heißt er bei den Antworten), rechts die Wirkung."
  ),
  "stages.*.on.*": H(
    "Wirkung",
    "Was bei diesem Ergebnis geschieht. Mit „→ bedingte Liste“ lassen sich mehrere Varianten mit Bedingungen anlegen; die erste passende gilt."
  ),
  "stages.*.on.*.when": H(
    "Bedingung",
    "Diese Variante gilt nur, wenn alle angegebenen Bedingungen erfüllt sind. Ohne Bedingung gilt sie immer (so lässt sich „sonst“ ausdrücken)."
  ),

  // dialogs
  dialogs: H(
    "Dialoge",
    "Alle Gesprächsknoten. Ein Knoten ist eine Aussage der Figur, meist mit Antworten für den Spieler. Mit „Weiter mit Knoten“ verzweigt ein Gespräch."
  ),
  "dialogs.*": H(
    "Gesprächsknoten",
    "Ein Abschnitt eines Gesprächs; sein Name wird in den Phasen und bei „Weiter mit Knoten“ verwendet."
  ),
  "dialogs.*.text": H("Text der Figur", "Was die Figur sagt."),
  "dialogs.*.choices": H(
    "Antworten",
    "Antworten, aus denen der Spieler wählt (höchstens 4). Ohne Antworten liest der Spieler nur und klickt „Weiter“."
  ),
  "dialogs.*.choices.*": H("Antwort", "Eine Antwortmöglichkeit des Spielers."),
  "dialogs.*.next": H(
    "Danach weiter mit",
    "Für Knoten ohne Antworten: Das Gespräch geht mit diesem Knoten weiter."
  ),
  "dialogs.*.result": H(
    "Ergebnis",
    "Für Knoten ohne Antworten: Ergebnis-Schlüssel am Ende (muss unter „on“ der Phase stehen)."
  ),

  // events & achievements
  events: H(
    "Zufallsereignisse",
    "Zwischenfälle, die beim Herumlaufen auftreten (Druckerstau, Rückfragen …). Sie verlangen eine Entscheidung und beeinflussen Punkte und Runden."
  ),
  "events.*": H("Ereignis", "Ein möglicher Zwischenfall."),
  "events.*.id": H("Interner Name", "Eindeutiger Name ohne Leerzeichen."),
  "events.*.title": H(
    "Titel",
    "Überschrift des Ereignisses, auch im Protokoll."
  ),
  "events.*.icon": H("Symbol", "Ein Emoji für das Ereignis."),
  "events.*.speaker": H("Sprecher", "Wer das Ereignis meldet."),
  "events.*.speaker.name": H("Name", "Name des Sprechers im Dialogfenster."),
  "events.*.speaker.title": H("Funktion", "Rolle des Sprechers."),
  "events.*.text": H(
    "Text",
    "Was der Sprecher sagt: die Situation, auf die der Spieler reagieren muss."
  ),
  "events.*.choices": H(
    "Antworten",
    "Handlungsmöglichkeiten des Spielers (höchstens 4). Punkte, Runden und Markierungen wie bei Dialogen."
  ),
  "events.*.stages": H(
    "Nur in Phasen",
    "Optional: Das Ereignis tritt nur in diesen Phasen auf. Leer = überall."
  ),
  "events.*.stages.*": H("Phase", "Eine Phase auswählen."),
  "events.*.requiresDoc": H(
    "Nur mit Dokument",
    "Angehakt = nur, wenn der Spieler das Dokument schon hat."
  ),
  "events.*.weight": H(
    "Häufigkeit",
    "Gewichtung bei der Zufallsauswahl: höher = häufiger (Standard 1)."
  ),
  eventSettings: H(
    "Ereignis-Einstellungen",
    "Wie oft und wann Zufallsereignisse auftreten."
  ),
  "eventSettings.minSteps": H(
    "Schritte (min)",
    "Mindestens so viele Schritte läuft der Spieler zwischen zwei Ereignissen."
  ),
  "eventSettings.maxSteps": H(
    "Schritte (max)",
    "Höchstens so viele Schritte zwischen zwei Ereignissen."
  ),
  "eventSettings.maxPerRun": H(
    "Ereignisse pro Spiel",
    "Höchstzahl der Ereignisse in einem Spieldurchgang."
  ),
  achievements: H(
    "Erfolge",
    "Abzeichen, die sich der Spieler durch bestimmtes Verhalten verdient. Jedes hat eine Regel."
  ),
  "achievements.*": H("Erfolg", "Ein Abzeichen."),
  "achievements.*.id": H("Interner Name", "Eindeutiger Name ohne Leerzeichen."),
  "achievements.*.title": H("Titel", "Name des Abzeichens."),
  "achievements.*.description": H(
    "Beschreibung",
    "Wie man den Erfolg bekommt – wird in der Erfolgsübersicht gezeigt."
  ),
  "achievements.*.icon": H("Symbol", "Ein Emoji für das Abzeichen."),
  "achievements.*.rule": H(
    "Regel",
    "Bedingungen für den Erfolg. Alle angegebenen müssen zutreffen. Felder über „+ Feld …“ hinzufügen."
  ),

  // values
  scoring: H(
    "Punkte & Sterne",
    "Wie viel Tipps und Fakten kosten bzw. bringen und wie die Sterne am Ende berechnet werden."
  ),
  "scoring.hintCost": H("Tipp-Kosten", "Punktabzug für einen Tipp."),
  "scoring.factBonus": H(
    "Fakt-Bonus",
    "Bonuspunkte für den ersten Fakt je Phase."
  ),
  "scoring.stars": H(
    "Sterne nach Runden",
    "Von oben nach unten: Die erste Zeile, deren Rundenzahl nicht überschritten wurde, gilt. Passt keine, gibt es 1 Stern."
  ),
  "scoring.stars.*": H("Stufe", "Eine Sternestufe."),
  "scoring.stars.*.roundsAtMost": H(
    "bis Runden",
    "Gilt, wenn höchstens so viele Runden gebraucht wurden."
  ),
  "scoring.stars.*.stars": H("Sterne", "Anzahl der Sterne (1–3)."),
  ui: H(
    "Beschriftungen",
    "Texte der Oberfläche. Nur ändern, was vom Standard abweichen soll."
  ),
  debrief: H(
    "Endbildschirm",
    "Zusätzliche Statistikzeilen am Ende (Punkte und Runden sind immer da)."
  ),
  "debrief.stats": H(
    "Statistikzeilen",
    "Zusätzliche Zeilen auf dem Endbildschirm."
  ),
  "debrief.stats.*": H("Zeile", "Eine Statistikzeile."),
  "debrief.stats.*.label": H(
    "Beschriftung",
    "Text vor dem Wert, z. B. „TIPPS“."
  ),
  "debrief.stats.*.stat": H(
    "Zähler",
    "Welcher Zähler angezeigt wird: talks, steps, hints, facts, events, eventsGood, eventsBad, wrongVisits, rooms."
  ),
}

/** Position in the game with indices / user-defined ids replaced by "*". */
export function normalize(path: Path): string {
  const out: string[] = []
  path.forEach((seg, i) => {
    if (typeof seg === "number") {
      // variant index inside a conditional result list is not part of the position
      if (out[0] === "stages" && out[2] === "on" && out.length === 4) return
      out.push("*")
      return
    }
    const top = out[0]
    if ((top === "npcs" || top === "dialogs") && i === 1) out.push("*")
    else if (top === "stages" && out[out.length - 1] === "on") out.push("*")
    else if (out[out.length - 1] === "statAtMost") out.push("*")
    else out.push(seg)
  })
  return out.join(".")
}

export function metaFor(path: Path): Meta {
  const key = normalize(path)
  if (MAP[key]) return MAP[key]
  const segs = key.split(".")
  const last = segs[segs.length - 1]
  // shared shapes
  if (segs.includes("look") && LOOK[last]) return LOOK[last]
  if (CHOICE[last] && segs.indexOf("choices") === segs.length - 3)
    return CHOICE[last]
  if (
    segs[0] === "stages" &&
    segs[2] === "on" &&
    segs.length === 5 &&
    EFFECT[last]
  )
    return EFFECT[last]
  const w = Math.max(segs.indexOf("when"), segs.indexOf("rule"))
  if (w >= 0 && w === segs.length - 2 && RULE[last]) return RULE[last]
  if (segs[0] === "ui" && segs.length === 2 && UI[last])
    return { label: last, help: UI[last] }
  return {}
}

/** Short explanations of the tabs, shown on top of each. */
export const TAB_HELP: Record<string, { title: string; text: string }> = {
  overview: {
    title: "Übersicht",
    text: "So sieht dein Prozess als Ganzes aus: jede Box ist eine Phase, jeder Pfeil ein mögliches Ergebnis. Hier wird nichts eingegeben, sondern geprüft, ob der Ablauf stimmt. Zum Bearbeiten nutze die Schaltflächen im Detailbereich oder die anderen Tabs.",
  },
  general: {
    title: "Allgemein",
    text: "Name, Einführung und feste Texte des Spiels. Hier legst du auch fest, wie viele Überarbeitungsrunden erlaubt sind, mit welcher Phase das Spiel startet und was in der Fortschrittsleiste steht.",
  },
  world: {
    title: "Welt",
    text: "Das Gebäude: Plan, Räume und die Kollegen, die herumlaufen. Wenn du nur einen anderen Prozess abbilden willst, reicht es meist, die Raumnamen (Türschilder) und die Grußsätze anzupassen – den Plan kannst du so lassen.",
  },
  npcs: {
    title: "Akteure",
    text: "Die Figuren, mit denen der Spieler spricht: Name, Funktion, Raum, Standort und Aussehen. Was eine Figur sagt, steht nicht hier, sondern in den Phasen (Tab „Ablauf“) und Dialogen (Tab „Dialoge“).",
  },
  stages: {
    title: "Ablauf",
    text: "Die Schritte des Prozesses. Pro Phase legst du fest, wer wo angesprochen werden muss, welcher Auftrag angezeigt wird und – unter „Ergebnisse“ – wohin es nach welchem Gesprächsausgang geht (nächste Phase, Überarbeitungsrunde, Ende).",
  },
  dialogs: {
    title: "Dialoge",
    text: "Die Gespräche. Jeder Knoten ist ein Text der Figur mit Antwortmöglichkeiten. Jede Antwort bringt Punkte und endet entweder in einem Ergebnis (das die Phase auswertet) oder führt zu einem weiteren Knoten. Welcher Knoten zu welcher Phase gehört, legst du im Tab „Ablauf“ fest.",
  },
  extras: {
    title: "Ereignisse & Erfolge",
    text: "Zufällige Zwischenfälle beim Herumlaufen, ihre Häufigkeit und die Abzeichen, die sich Spieler verdienen können. Beides ist optional und macht das Spiel abwechslungsreicher.",
  },
  values: {
    title: "Spielwerte",
    text: "Feineinstellungen: Punkte für Tipps und Fakten, Sternevergabe, Beschriftungen der Oberfläche und Zusatzzeilen am Ende. Alles ist optional – ohne Angabe gelten die Standardwerte.",
  },
  json: {
    title: "JSON",
    text: "Das ganze Spiel als Text. Für Fortgeschrittene, zum Kopieren oder wenn ein Feld in den Formularen fehlt. Nach dem Bearbeiten „JSON übernehmen“ klicken.",
  },
}

export const ENUM_LABELS: Record<string, Record<string, string>> = {
  tone: {
    good: "good – positiv (grün)",
    bad: "bad – negativ (rot)",
    info: "info – neutral",
  },
  ending: { success: "success – Erfolg", failed: "failed – Scheitern" },
  finished: { success: "success – Erfolg", failed: "failed – Scheitern" },
  role: { hint: "hint – verkauft Tipps", fact: "fact – erzählt Fakten" },
  facing: {
    up: "up – oben",
    down: "down – unten",
    left: "left – links",
    right: "right – rechts",
  },
  accessory: {
    glasses: "glasses – Brille",
    tie: "tie – Krawatte",
    bow: "bow – Schleife",
    cap: "cap – Mütze",
  },
}
