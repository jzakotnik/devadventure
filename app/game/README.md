# FZ Prozess Quest (isolated game module)

A 90s-style top-down browser game that teaches the Modulvorschlag process
(PM → BMZ → PEA → Teamleitung). Served at `/game`.

**Isolation:** everything lives in `app/game/`. It uses relative imports only,
no shared components, no extra dependencies (canvas + React + a CSS module), and
generates all pixel art and sound in code (no asset files). To move it to its own
repo, copy this folder into a fresh Next.js `app/game/` (or make `GameClient`
the root page).

## Layout

- `_content/modulvorschlag.json` – **the whole process**: map, rooms, NPCs,
  stages, dialogs, scoring, texts. Edit this to change the game.
- `_game/schema.ts` – types for that JSON. `_game/validate.ts` checks it (runs in dev, logs to console).
- `_game/engine.ts` – pure state machine (stages, rounds, score, dialogs).
- `_game/world.ts` – movement, click-to-walk (BFS), particles.
- `_game/render.ts`, `font.ts` – canvas renderer, procedural sprites, 3x5 pixel font.
- `_game/audio.ts` – WebAudio chiptune sfx + music.
- `_components/` – React overlays (HUD, dialog, debrief). `game.module.css` – styles.

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
