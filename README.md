# FZ Prozess Quest

A 90s-style top-down browser game that teaches the Modulvorschlag process
(PM → BMZ → PEA → Teamleitung). Served at the site root.

A standalone Next.js app (App Router): canvas + React + a CSS module. No backend, no
database, no extra runtime dependencies; pixel art and sound are generated in code, so
there are no asset files. Progress (best score, achievements) is stored in the
browser's `localStorage` only.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production, static page
```

## Layout

- `_content/modulvorschlag.json` – **the whole process**: map, rooms, NPCs,
  stages, dialogs, scoring, texts. Edit this to change the game.
- `_game/schema.ts` – types for that JSON. `_game/validate.ts` checks it (runs in dev, logs to console).
- `_game/engine.ts` – pure state machine (stages, rounds, score, dialogs).
- `_game/world.ts` – movement, click-to-walk (BFS), particles.
- `_game/render.ts`, `font.ts` – canvas renderer, procedural sprites, 3x5 pixel font.
- `_game/audio.ts` – WebAudio chiptune sfx + music.
- `_components/` – React overlays (HUD, dialog, debrief). `game.module.css` – styles.

## Several games

`/` is a launcher menu: play one of the available games (list is read from disk on every
request) or design a new one in the editor. `/?game=<id>` plays a game directly; every JSON
file in `app/_content/` (or saved by the editor in `data/games/`) is one, e.g.
`/?game=urlaubsantrag`. The file is validated on load; an invalid
or missing file shows an error page listing the problems. To make a new process, copy a file,
then change actors (`npcs`), rooms, `stages`, `dialogs`, `texts` and `pipeline`.

### Editor

`/editor` is an interactive editor: pick any existing game as a template (built-in or
previously saved), edit it in tabs (general, world, actors, flow, dialogs, events and
achievements, game values, raw JSON), see validation problems live, and save under an id.
`/?game=<id>` then plays it. Reference fields (room, npc, stage, dialog) are dropdowns.

The first tab, "Übersicht", draws the flow as a graph: stages as boxes (colour = room),
results as arrows (dashed = costs a round, yellow = conditional), rework loops below the
stage they branch from. Click a stage to read its dialog as a script (choice → result →
what happens next).

Saved games are written to `data/games/<id>.json` (git-ignored; move a file to
`app/_content/` to ship it with the app). Built-in games are read-only, so use a new id.
Saving is allowed in dev; in production set `GAME_EDITOR=1` (the endpoint has no
authentication, so only enable it where that is acceptable). Needs a writable filesystem.

Optional blocks (all fields have defaults, see `schema.ts`):

- `scoring`: `hintCost`, `factBonus`, `stars: [{roundsAtMost, stars}]`.
- `ui`: HUD/button strings. Set `ui.document` to `""` to hide the document slot, or name it
  (`ANTRAG`, `BESTELLUNG`, ...).
- `debrief.stats`: extra lines on the end screen, `[{label, stat}]` (stat names as for achievements).
- Conditional results: a stage's `on.RESULT` may be a list of effects. The first one whose
  `when` holds is used (`when` takes the achievement rule fields: `flag`, `scoreAtLeast`,
  `scoreAtMost`, `roundsAtLeast`, `stat`+`gte`, ...). Flags are set by `choices[].flag`.

## SEO, favicons and link previews

- Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://quest.example.com`) **at build time**; it is the base
  for absolute URLs in canonical links, Open Graph tags, the sitemap and robots.txt. Without it,
  `VERCEL_PROJECT_PRODUCTION_URL` or `http://localhost:3000` is used.
- Every game has its own title, description (subtitle + first intro paragraph), canonical URL,
  Open Graph / Twitter card and schema.org `VideoGame` data. The preview image is generated at
  `/og?game=<id>` (generic: `/og`).
- Games built in `app/_content/` are indexed and listed in `/sitemap.xml`; games saved in the
  editor are shareable but `noindex`. `/editor` and `/api/` are disallowed in `robots.txt`.
  Unknown games return a real 404.
- Icons: `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`, `public/icon-192.png` and
  `public/icon-512.png` (web app manifest at `/manifest.webmanifest`). Site name and
  description live in `app/_game/site.ts`.

## Controls

Arrows / WASD move · E, Enter or click an NPC to talk · 1–3 or click to answer · M mute.

## Process JSON in short

- `map.layout`: `#` wall, `_` room floor, `.` corridor, `+` door, `d` desk, `s` shelf,
  `p` plant, `c` coffee, `r` printer, `t` table. `rooms[].rect` = [x,y,w,h] in tiles.
- `stages[]`: current objective, which NPC/room, `dialog`, optional `repeatDialog`, and
  `on: { RESULT: { next, costsRound, docVersion, score, ending, message } }`.
- `dialogs{}`: nodes with `choices[]` (`reply`, `learn`, `score`, `result` or `goto`).
- `roundLimit`: more revision rounds than this ends the game without approval.
- NPC `role: "hint"` sells a hint (−2), `role: "fact"` gives a bonus fact (+3 once per stage).

## Random events and achievements

- `events[]`: random incidents (printer jam, status request, fire drill, ...). They
  fire after `eventSettings.minSteps`–`maxSteps` walked steps, at most `maxPerRun` per run,
  never twice, never during the intake stage. Optional `stages` / `requiresDoc` limit
  when an event can appear. Choices use the normal dialog fields plus `round` (±revision
  rounds) and `flag` (for achievements).
- `achievements[]`: declarative `rule`s (all given fields must hold): `stat`+`gte`
  (`talks`, `steps`, `hints`, `facts`, `eventsGood`, `eventsBad`, `events`, `wrongVisits`),
  `statAtMost`, `finished`, `roundsAtMost/AtLeast`, `scoreAtLeast`, `flag`, `roomsVisited`.
  Unlocks are announced in-game and stored in `localStorage` (`bueroquest:ach:<process id>`).

## Ambient colleagues

`ambient` in the process JSON: `wanderers[]` (name, look, start tile) walk randomly through
the whole building. When one passes within `greetDistance` tiles they show a short speech
bubble (random from `lines`, per-person `cooldownSec`). They never stop or block the player
and have no dialog; the player can walk straight through them.
