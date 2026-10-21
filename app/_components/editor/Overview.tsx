"use client"

import { useState } from "react"
import type { Choice, Effect, Process, Stage } from "../../_game/schema"
import styles from "../../editor.module.css"

/**
 * Visual overview of a game's flow: stages as nodes, transitions (results of
 * the stage's dialogs) as arrows, plus a readable "script" of the selected
 * stage: dialog -> choices -> result -> what happens next.
 */

const W = 190
const H = 70
const GX = 120
const GY = 52
const PAD_TOP = 56
const PAD_X = 24

type Tone = "normal" | "cond" | "round" | "good" | "bad"
const COLORS: Record<Tone, string> = {
  normal: "#8ab4ff",
  cond: "#ffd866",
  round: "#ff9a6b",
  good: "#7fd18b",
  bad: "#ff7a7a",
}

const cut = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s

/** Short form for graph labels. */
function condShort(rule: NonNullable<Effect["when"]>): string {
  return Object.entries(rule)
    .map(([k, v]) =>
      k === "flag" ? `⚑${v}` : `${k}${typeof v === "object" ? "…" : ` ${v}`}`
    )
    .join(" ")
}

function condText(rule: NonNullable<Effect["when"]>): string {
  return Object.entries(rule)
    .map(([k, v]) =>
      k === "flag"
        ? `Markierung „${v}“`
        : typeof v === "object"
          ? `${k} ${JSON.stringify(v)}`
          : `${k} ${v}`
    )
    .join(", ")
}

const effectsOf = (entry: Effect | Effect[] | undefined): Effect[] =>
  entry === undefined ? [] : Array.isArray(entry) ? entry : [entry]

/* ------------------------------------------------------------------ graph */

interface GNode {
  id: string
  kind: "stage" | "success" | "failed"
  rank: number
  x: number
  y: number
  reachable: boolean
}

interface GEdge {
  from: string
  to: string
  labels: Array<{ text: string; tone: Tone }>
}

const SUCCESS = "__success"
const FAILED = "__failed"

function buildGraph(proc: Process) {
  const edges = new Map<string, GEdge>()
  const add = (from: string, to: string, text: string, tone: Tone) => {
    const k = `${from}>${to}`
    const e = edges.get(k) ?? { from, to, labels: [] }
    if (!e.labels.some((l) => l.text === text)) e.labels.push({ text, tone })
    edges.set(k, e)
  }
  for (const s of proc.stages) {
    for (const [result, entry] of Object.entries(s.on)) {
      for (const eff of effectsOf(entry)) {
        const to =
          eff.ending === "success"
            ? SUCCESS
            : eff.ending === "failed"
              ? FAILED
              : (eff.next ?? s.id)
        const text = result + (eff.when ? ` ${condShort(eff.when)}` : "")
        add(
          s.id,
          to,
          text,
          eff.costsRound ? "round" : eff.when ? "cond" : "normal"
        )
      }
    }
  }

  // Pass 1: rank = distance from the first stage (BFS over forward edges).
  const bfs = (skipFrom: Set<string>) => {
    const rank = new Map<string, number>([[proc.firstStage, 0]])
    const parent = new Map<string, string>()
    const order = [proc.firstStage]
    for (let i = 0; i < order.length; i++) {
      if (skipFrom.has(order[i])) continue
      for (const e of edges.values()) {
        if (e.from !== order[i] || e.to === e.from || rank.has(e.to)) continue
        if (e.to === SUCCESS || e.to === FAILED) continue
        rank.set(e.to, rank.get(order[i])! + 1)
        parent.set(e.to, order[i])
        order.push(e.to)
      }
    }
    return { rank, parent, order }
  }
  const first = bfs(new Set())
  // Detours (rework loops): stages whose only way out leads back to earlier
  // stages. They are drawn below the stage they branch from.
  const detours = new Set<string>()
  for (const id of first.order) {
    if (id === proc.firstStage) continue
    const outs = [...edges.values()].filter((e) => e.from === id && e.to !== id)
    if (
      outs.length &&
      outs.every(
        (e) =>
          first.rank.has(e.to) && first.rank.get(e.to)! < first.rank.get(id)!
      )
    )
      detours.add(id)
  }
  const { rank, order } = bfs(detours)
  for (const id of detours) {
    const par = first.parent.get(id)
    if (par && rank.has(par)) rank.set(id, rank.get(par)!)
    if (!order.includes(id)) order.push(id)
  }
  const maxRank = Math.max(0, ...rank.values())
  const unreachable = proc.stages.map((s) => s.id).filter((id) => !rank.has(id))
  unreachable.forEach((id) => rank.set(id, maxRank + 1))
  const terminals: Array<[string, GNode["kind"]]> = []
  if ([...edges.values()].some((e) => e.to === SUCCESS))
    terminals.push([SUCCESS, "success"])
  if ([...edges.values()].some((e) => e.to === FAILED))
    terminals.push([FAILED, "failed"])
  const termRank = unreachable.length ? maxRank + 2 : maxRank + 1
  for (const [id] of terminals) rank.set(id, termRank)

  const columns = new Map<number, string[]>()
  const place = (id: string) => {
    const r = rank.get(id)!
    columns.set(r, [...(columns.get(r) ?? []), id])
  }
  // main path first, then detours, so detours sit below their parent column
  for (const id of order) if (!detours.has(id)) place(id)
  for (const id of order) if (detours.has(id)) place(id)
  for (const id of unreachable) place(id)
  for (const [id] of terminals) place(id)
  const tallest = Math.max(...[...columns.values()].map((c) => c.length))
  const nodes = new Map<string, GNode>()
  for (const [r, ids] of columns) {
    const offset = ((tallest - ids.length) * (H + GY)) / 2
    ids.forEach((id, row) => {
      const kind =
        id === SUCCESS ? "success" : id === FAILED ? "failed" : "stage"
      nodes.set(id, {
        id,
        kind,
        rank: r,
        x: PAD_X + r * (W + GX),
        y: PAD_TOP + offset + row * (H + GY),
        reachable: !unreachable.includes(id),
      })
    })
  }
  const width = PAD_X * 2 + (Math.max(...columns.keys()) + 1) * (W + GX) - GX
  const bottom = PAD_TOP + tallest * (H + GY) - GY
  return { nodes, edges: [...edges.values()], width, bottom }
}

function edgeTone(e: GEdge): Tone {
  if (e.to === SUCCESS) return "good"
  if (e.to === FAILED) return "bad"
  if (e.labels.some((l) => l.tone === "round")) return "round"
  if (e.labels.some((l) => l.tone === "cond")) return "cond"
  return "normal"
}

function FlowGraph({
  proc,
  selected,
  onSelect,
}: {
  proc: Process
  selected: string
  onSelect: (id: string) => void
}) {
  const g = buildGraph(proc)
  const stageById = new Map(proc.stages.map((s) => [s.id, s]))
  const roomOf = (id: string) => proc.rooms.find((r) => r.id === id)
  const back = g.edges.filter((e) => {
    const a = g.nodes.get(e.from)!
    const b = g.nodes.get(e.to)!
    return e.from !== e.to && b.rank < a.rank
  })
  const height = g.bottom + 40 + back.length * 18 + 30

  const paths = g.edges.map((e) => {
    const a = g.nodes.get(e.from)
    const b = g.nodes.get(e.to)
    if (!a || !b) return null
    const tone = edgeTone(e)
    let d: string
    let lx: number
    let ly: number
    let side: "left" | "right" | "center" = "center"
    if (e.from === e.to) {
      const x = a.x + W - 50
      d = `M ${x} ${a.y} C ${x} ${a.y - 38}, ${x + 36} ${a.y - 38}, ${x + 36} ${a.y}`
      lx = x + 18
      ly = a.y - 36
    } else if (b.rank === a.rank) {
      const down = b.y > a.y
      const ox = down ? W * 0.35 : W * 0.65
      const sy = down ? a.y + H : a.y
      const ey = down ? b.y : b.y + H
      d = `M ${a.x + ox} ${sy} L ${b.x + ox} ${ey}`
      lx = a.x + ox
      ly = (sy + ey) / 2
      side = down ? "left" : "right"
    } else if (b.rank > a.rank) {
      const sx = a.x + W
      const sy = a.y + H / 2
      const ex = b.x
      const ey = b.y + H / 2
      const dx = (ex - sx) / 2
      d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`
      lx = (sx + ex) / 2
      ly = (sy + ey) / 2
    } else {
      const k = back.indexOf(e)
      const by = g.bottom + 40 + k * 18
      const sx = a.x + W / 2 + (k % 3) * 8
      const sy = a.y + H
      const ex = b.x + W / 2 + (k % 3) * 8
      const ey = b.y + H
      d = `M ${sx} ${sy} C ${sx} ${by}, ${ex} ${by}, ${ex} ${ey}`
      lx = (sx + ex) / 2
      ly = (6 * by + sy + ey) / 8
    }
    return { e, d, lx, ly, tone, side }
  })

  return (
    <div className={styles.graphScroll}>
      <svg
        viewBox={`0 0 ${g.width} ${height}`}
        width="100%"
        style={{ minWidth: Math.min(g.width, 1000) }}
        className={styles.graph}
      >
        <defs>
          {(Object.keys(COLORS) as Tone[]).map((t) => (
            <marker
              key={t}
              id={`arrow-${t}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS[t]} />
            </marker>
          ))}
        </defs>
        {paths.map(
          (p) =>
            p && (
              <path
                key={`${p.e.from}>${p.e.to}`}
                d={p.d}
                fill="none"
                stroke={COLORS[p.tone]}
                strokeWidth={1.6}
                strokeDasharray={p.tone === "round" ? "5 4" : undefined}
                opacity={
                  selected === p.e.from || selected === p.e.to ? 1 : 0.55
                }
                markerEnd={`url(#arrow-${p.tone})`}
              />
            )
        )}
        {[...g.nodes.values()].map((n) => {
          if (n.kind !== "stage") {
            const ok = n.kind === "success"
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <rect
                  width={W}
                  height={H}
                  rx={H / 2}
                  fill={ok ? "#173a22" : "#3a1a1f"}
                  stroke={ok ? COLORS.good : COLORS.bad}
                  strokeWidth={2}
                />
                <text
                  x={W / 2}
                  y={H / 2 + 5}
                  textAnchor="middle"
                  className={styles.nodeTitle}
                >
                  {ok ? "🏁 " : "✖ "}
                  {cut(
                    ok ? proc.texts.successTitle : proc.texts.failedTitle,
                    20
                  )}
                </text>
              </g>
            )
          }
          const s = stageById.get(n.id)
          if (!s) return null
          const room = roomOf(s.room)
          const step = proc.pipeline.find((p) => p.stages.includes(s.id))
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={styles.node}
              onClick={() => onSelect(n.id)}
            >
              <rect
                width={W}
                height={H}
                rx={8}
                fill="#14183a"
                stroke={selected === n.id ? "#fff" : (room?.color ?? "#556")}
                strokeWidth={selected === n.id ? 3 : 2}
                strokeDasharray={n.reachable ? undefined : "4 3"}
              />
              <rect width={8} height={H} rx={4} fill={room?.color ?? "#556"} />
              <text x={18} y={22} className={styles.nodeTitle}>
                {s.id === proc.firstStage ? "▶ " : ""}
                {cut(s.title, 22)}
              </text>
              <text x={18} y={41} className={styles.nodeSub}>
                {cut(
                  `${proc.npcs[s.npc]?.name ?? s.npc} · ${room?.label ?? s.room}`,
                  28
                )}
              </text>
              <text x={18} y={59} className={styles.nodeStep}>
                {n.reachable ? (step?.label ?? "") : "⚠ nicht erreichbar"}
              </text>
            </g>
          )
        })}
        {paths.map((p) => {
          if (!p) return null
          const lines = p.e.labels.map((l) => cut(l.text, 26))
          const w = Math.max(...lines.map((l) => l.length)) * 6.9 + 12
          const h = lines.length * 13 + 6
          const cx =
            p.side === "left"
              ? p.lx - w / 2 - 6
              : p.side === "right"
                ? p.lx + w / 2 + 6
                : p.lx
          return (
            <g key={`l-${p.e.from}>${p.e.to}`} className={styles.edgeLabel}>
              <rect
                x={cx - w / 2}
                y={p.ly - h / 2}
                width={w}
                height={h}
                rx={4}
                fill="#07070f"
                stroke={COLORS[p.tone]}
                strokeOpacity={0.6}
              />
              {lines.map((l, i) => (
                <text
                  key={i}
                  x={cx}
                  y={p.ly - h / 2 + 15 + i * 13}
                  textAnchor="middle"
                  fill={
                    COLORS[
                      p.e.labels[i].tone === "normal"
                        ? "normal"
                        : p.e.labels[i].tone
                    ]
                  }
                >
                  {l}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ---------------------------------------------------------- stage script */

function EffectLines({
  proc,
  stage,
  result,
}: {
  proc: Process
  stage: Stage
  result: string | undefined
}) {
  if (!result) return <span className={styles.flowNote}>→ (kein Ergebnis)</span>
  const effs = effectsOf(stage.on[result])
  if (!effs.length)
    return (
      <span className={styles.flowBad}>
        ⚠ Ergebnis „{result}“ fehlt in „on“
      </span>
    )
  const title = (id: string) =>
    proc.stages.find((s) => s.id === id)?.title ?? id
  return (
    <>
      {effs.map((e, i) => {
        const parts: string[] = []
        parts.push(
          e.ending === "success"
            ? `🏁 ${proc.texts.successTitle}`
            : e.ending === "failed"
              ? `✖ ${proc.texts.failedTitle}`
              : e.next
                ? `→ ${title(e.next)}`
                : "→ bleibt in dieser Phase"
        )
        if (e.costsRound) parts.push("+1 Runde")
        if (e.score) parts.push(`${e.score > 0 ? "+" : ""}${e.score} Punkte`)
        if (e.giveDoc) parts.push("Dokument erhalten")
        if (e.docVersion) parts.push(`Dokument-Version +${e.docVersion}`)
        return (
          <div key={i} className={styles.flowEffect}>
            <b>{result}</b>
            {e.when && <em> wenn {condText(e.when)}</em>}: {parts.join(" · ")}
            {e.message && <small> „{cut(e.message, 70)}“</small>}
          </div>
        )
      })}
    </>
  )
}

function DialogScript({
  proc,
  stage,
  nodeId,
  seen,
}: {
  proc: Process
  stage: Stage
  nodeId: string
  seen: string[]
}) {
  const node = proc.dialogs[nodeId]
  if (!node)
    return <span className={styles.flowBad}>⚠ Dialog „{nodeId}“ fehlt</span>
  const seenNow = [...seen, nodeId]
  const follow = (next: string | undefined) =>
    next &&
    (seenNow.includes(next) ? (
      <div className={styles.flowNote}>↺ weiter mit „{next}“ (siehe oben)</div>
    ) : (
      <DialogScript proc={proc} stage={stage} nodeId={next} seen={seenNow} />
    ))
  return (
    <div className={styles.script}>
      <div className={styles.say}>
        <span className={styles.nodeId}>{nodeId}</span> „{cut(node.text, 160)}“
      </div>
      {(node.choices ?? []).map((c: Choice, i) => (
        <div key={i} className={styles.choiceRow}>
          <div>
            <span className={styles.no}>{i + 1}</span> {cut(c.text, 120)}
            {c.score !== undefined && c.score !== 0 && (
              <span className={c.score > 0 ? styles.plus : styles.minus}>
                {c.score > 0 ? "+" : ""}
                {c.score}
              </span>
            )}
            {c.flag && <span className={styles.tag}>⚑ {c.flag}</span>}
            {c.round ? (
              <span className={styles.tag}>
                Runden {c.round > 0 ? "+" : ""}
                {c.round}
              </span>
            ) : null}
          </div>
          {c.reply && (
            <div className={styles.reply}>↳ „{cut(c.reply, 110)}“</div>
          )}
          <div className={styles.outcome}>
            {c.goto ? (
              <>
                weiter im Gespräch: <b>{c.goto}</b>
                {follow(c.goto)}
              </>
            ) : (
              <EffectLines
                proc={proc}
                stage={stage}
                result={c.result ?? node.result}
              />
            )}
          </div>
        </div>
      ))}
      {!node.choices?.length && (
        <div className={styles.outcome}>
          {node.next ? (
            <>
              dann: <b>{node.next}</b>
              {follow(node.next)}
            </>
          ) : (
            <EffectLines proc={proc} stage={stage} result={node.result} />
          )}
        </div>
      )}
    </div>
  )
}

function StagePanel({
  proc,
  stage,
  onEdit,
}: {
  proc: Process
  stage: Stage
  onEdit: (tab: string) => void
}) {
  const npc = proc.npcs[stage.npc]
  const room = proc.rooms.find((r) => r.id === stage.room)
  return (
    <section className={styles.panel}>
      <header className={styles.panelHead}>
        <h3>{stage.title}</h3>
        <span>
          <button className={styles.mini} onClick={() => onEdit("stages")}>
            ✎ Phase bearbeiten
          </button>{" "}
          <button className={styles.mini} onClick={() => onEdit("dialogs")}>
            ✎ Dialoge bearbeiten
          </button>
        </span>
      </header>
      <p className={styles.panelLine}>
        <b>Auftrag:</b> {stage.objective}
      </p>
      <p className={styles.panelLine}>
        <b>Wer / wo:</b> {npc?.name ?? stage.npc} ({npc?.title}) im Raum „
        {room?.label ?? stage.room}“
      </p>
      <h4>Gespräch beim ersten Besuch</h4>
      <DialogScript proc={proc} stage={stage} nodeId={stage.dialog} seen={[]} />
      {stage.repeatDialog && (
        <>
          <h4>Gespräch bei erneutem Besuch</h4>
          <DialogScript
            proc={proc}
            stage={stage}
            nodeId={stage.repeatDialog}
            seen={[]}
          />
        </>
      )}
    </section>
  )
}

export function Overview({
  proc,
  onEdit,
}: {
  proc: Process
  onEdit: (tab: string) => void
}) {
  const [picked, setPicked] = useState(proc.firstStage)
  const stage =
    proc.stages.find((s) => s.id === picked) ??
    proc.stages.find((s) => s.id === proc.firstStage) ??
    proc.stages[0]
  if (!stage) return <p>Keine Phasen vorhanden.</p>

  return (
    <div>
      <p className={styles.flowNote}>
        Jede Box ist eine Phase (Farbe = Raum). Pfeile zeigen, welches Ergebnis
        des Gesprächs wohin führt. Klicke eine Phase, um das Gespräch Schritt
        für Schritt zu sehen. Mehr als {proc.roundLimit} Runden → Scheitern.
      </p>
      <ul className={styles.legend}>
        <li style={{ color: COLORS.normal }}>── Ergebnis</li>
        <li style={{ color: COLORS.round }}>- - kostet eine Runde</li>
        <li style={{ color: COLORS.cond }}>── nur unter Bedingung</li>
        <li style={{ color: COLORS.good }}>── Erfolg</li>
        <li style={{ color: COLORS.bad }}>── Scheitern</li>
      </ul>
      <FlowGraph proc={proc} selected={stage.id} onSelect={setPicked} />
      <StagePanel proc={proc} stage={stage} onEdit={onEdit} />
    </div>
  )
}
