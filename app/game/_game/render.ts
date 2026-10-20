import { drawText, textWidth } from "./font"
import { TILE } from "./map"
import type { Dir, NpcLook, Process } from "./schema"
import type { World } from "./world"

export const VIEW_W = 28 * TILE
export const VIEW_H = 18 * TILE

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, v + amt))
  const r = c((n >> 16) & 255)
  const g = c((n >> 8) & 255)
  const b = c(n & 255)
  return `rgb(${r},${g},${b})`
}

function rect(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/* ---------------------------------------------------------------- props */

function floorTile(
  ctx: CanvasRenderingContext2D,
  base: string,
  x: number,
  y: number,
  room: boolean
) {
  const px = x * TILE
  const py = y * TILE
  const alt = (x + y) % 2 === 0
  rect(ctx, alt ? base : shade(base, room ? -10 : -8), px, py, TILE, TILE)
  rect(ctx, shade(base, alt ? 10 : 4), px, py, TILE, 1)
  if (room) {
    rect(ctx, shade(base, -22), px + 3, py + 5, 1, 1)
    rect(ctx, shade(base, -22), px + 10, py + 11, 1, 1)
  } else {
    rect(ctx, shade(base, -18), px, py + TILE - 1, TILE, 1)
  }
}

function wallTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  windowed: boolean
) {
  const px = x * TILE
  const py = y * TILE
  rect(ctx, "#8a90a8", px, py, TILE, 4) // cap
  rect(ctx, "#b8bed4", px, py, TILE, 1)
  rect(ctx, "#4a4f68", px, py + 4, TILE, 12) // face
  for (let r = 0; r < 3; r++) {
    rect(ctx, "#3a3e54", px, py + 7 + r * 4, TILE, 1)
    const off = r % 2 === 0 ? 4 : 10
    rect(ctx, "#3a3e54", px + off, py + 4 + r * 4, 1, 4)
  }
  rect(ctx, "#2a2d40", px, py + 15, TILE, 1)
  if (windowed) {
    rect(ctx, "#1c2038", px + 3, py + 5, 10, 8)
    rect(ctx, "#7ec8ff", px + 4, py + 6, 8, 6)
    rect(ctx, "#cfeaff", px + 4, py + 6, 3, 2)
    rect(ctx, "#1c2038", px + 7, py + 6, 1, 6)
  }
}

function doorTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TILE
  const py = y * TILE
  rect(ctx, "#6a4a2a", px, py, TILE, TILE)
  rect(ctx, "#2a1a0a", px, py, 2, TILE)
  rect(ctx, "#2a1a0a", px + TILE - 2, py, 2, TILE)
  rect(ctx, "#ffd866", px + 5, py + 1, 6, 1)
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number
) {
  const px = x * TILE
  const py = y * TILE
  switch (kind) {
    case "d": // desk
      rect(ctx, "rgba(0,0,0,.25)", px, py + 14, TILE, 2)
      rect(ctx, "#a06a38", px, py + 3, TILE, 11)
      rect(ctx, "#c88a50", px, py + 3, TILE, 2)
      rect(ctx, "#7a4a22", px, py + 12, TILE, 2)
      rect(ctx, "#2a2f40", px + 4, py + 4, 8, 5) // monitor
      rect(ctx, "#6ad0ff", px + 5, py + 5, 6, 3)
      rect(ctx, "#2a2f40", px + 7, py + 9, 2, 1)
      break
    case "s": // shelf
      rect(ctx, "#5a3a1a", px, py + 1, TILE, 15)
      rect(ctx, "#3a2410", px + 1, py + 2, 14, 13)
      for (let r = 0; r < 3; r++) {
        rect(ctx, "#7a5228", px + 1, py + 6 + r * 4, 14, 1)
        const cols = ["#d84a4a", "#4a8ad8", "#d8c04a", "#4ab86a", "#a04ad8"]
        for (let b = 0; b < 5; b++)
          rect(ctx, cols[(b + r + x) % 5], px + 2 + b * 3, py + 3 + r * 4, 2, 3)
      }
      break
    case "p": // plant
      rect(ctx, "#8a4a2a", px + 5, py + 10, 6, 5)
      rect(ctx, "#6a3418", px + 5, py + 10, 6, 1)
      rect(ctx, "#2f8a3a", px + 3, py + 4, 10, 7)
      rect(ctx, "#4ab85a", px + 5, py + 2, 6, 6)
      rect(ctx, "#7ae08a", px + 6, py + 3, 2, 2)
      break
    case "c": // coffee machine
      rect(ctx, "rgba(0,0,0,.25)", px + 1, py + 14, 14, 2)
      rect(ctx, "#3a3f50", px + 2, py + 1, 12, 14)
      rect(ctx, "#5a6078", px + 2, py + 1, 12, 2)
      rect(ctx, "#e8e8f0", px + 5, py + 8, 6, 5)
      rect(ctx, "#6a3a1a", px + 6, py + 9, 4, 2)
      rect(ctx, "#ff5a4a", px + 4, py + 4, 2, 2)
      rect(ctx, "#5aff7a", px + 8, py + 4, 2, 2)
      break
    case "r": // printer
      rect(ctx, "rgba(0,0,0,.25)", px + 1, py + 14, 14, 2)
      rect(ctx, "#d0d4e0", px + 1, py + 6, 14, 8)
      rect(ctx, "#a0a6bc", px + 1, py + 11, 14, 3)
      rect(ctx, "#fff", px + 4, py + 2, 8, 5)
      rect(ctx, "#2a2f40", px + 4, py + 10, 8, 1)
      rect(ctx, "#5aff7a", px + 12, py + 8, 2, 1)
      break
    case "t": // table
      rect(ctx, "rgba(0,0,0,.25)", px, py + 14, TILE, 2)
      rect(ctx, "#8a5a2e", px, py + 2, TILE, 12)
      rect(ctx, "#b8844a", px, py + 2, TILE, 2)
      rect(ctx, "#6a4220", px, py + 12, TILE, 2)
      if ((x + y) % 2 === 0) {
        rect(ctx, "#fff", px + 4, py + 6, 5, 4)
        rect(ctx, "#c0c4d0", px + 5, py + 7, 3, 1)
      }
      break
  }
}

/* ------------------------------------------------------------ characters */

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  look: NpcLook,
  facing: Dir,
  frame: number,
  px: number,
  py: number,
  lanyard = false
) {
  rect(ctx, "rgba(0,0,0,.3)", px + 4, py + 14, 8, 2)
  const step = frame % 2 === 1 ? 1 : 0
  // legs
  rect(ctx, look.pants, px + 5, py + 11, 3, 4 - step)
  rect(ctx, look.pants, px + 8, py + 11, 3, 3 + step)
  rect(ctx, "#1a1a24", px + 5, py + 14 - step, 3, 1)
  rect(ctx, "#1a1a24", px + 8, py + 13 + step, 3, 1)
  // body
  rect(ctx, look.shirt, px + 4, py + 6, 8, 6)
  rect(ctx, shade(look.shirt, -30), px + 4, py + 11, 8, 1)
  rect(ctx, look.skin, px + 3, py + 7, 1, 4)
  rect(ctx, look.skin, px + 12, py + 7, 1, 4)
  if (look.accessory === "tie" && facing === "down")
    rect(ctx, "#d84a4a", px + 7, py + 6, 2, 5)
  if (lanyard && facing !== "up") {
    rect(ctx, "#ffd866", px + 7, py + 6, 2, 3)
    rect(ctx, "#fff", px + 7, py + 9, 2, 2)
  }
  // head
  rect(ctx, look.skin, px + 5, py + 1, 6, 6)
  if (facing === "up") {
    rect(ctx, look.hair, px + 4, py, 8, 7)
  } else {
    rect(ctx, look.hair, px + 4, py, 8, 3)
    rect(ctx, look.hair, px + 4, py + 2, 1, 3)
    rect(ctx, look.hair, px + 11, py + 2, 1, 3)
    if (facing === "down") {
      rect(ctx, "#1a1a24", px + 6, py + 4, 1, 2)
      rect(ctx, "#1a1a24", px + 9, py + 4, 1, 2)
    } else if (facing === "left") {
      rect(ctx, "#1a1a24", px + 6, py + 4, 1, 2)
      rect(ctx, look.hair, px + 10, py + 2, 2, 4)
    } else {
      rect(ctx, "#1a1a24", px + 9, py + 4, 1, 2)
      rect(ctx, look.hair, px + 4, py + 2, 2, 4)
    }
    if (look.accessory === "glasses" && facing === "down") {
      rect(ctx, "#2a2f40", px + 5, py + 3, 3, 1)
      rect(ctx, "#2a2f40", px + 8, py + 3, 3, 1)
    }
  }
  if (look.accessory === "cap") {
    rect(ctx, "#d84a4a", px + 4, py - 1, 8, 3)
    if (facing === "left") rect(ctx, "#d84a4a", px + 2, py + 1, 3, 1)
    else if (facing === "right") rect(ctx, "#d84a4a", px + 11, py + 1, 3, 1)
    else if (facing === "down") rect(ctx, "#a02a2a", px + 4, py + 2, 8, 1)
  }
  if (look.accessory === "bow") {
    rect(ctx, "#ff7ab8", px + 10, py + 1, 3, 2)
    rect(ctx, "#ff7ab8", px + 3, py + 1, 0, 0)
  }
}

export const PLAYER_LOOK: NpcLook = {
  shirt: "#3a7ad8",
  pants: "#2a2f50",
  hair: "#3a2a1a",
  skin: "#f0c8a0",
  accessory: undefined,
}

/* ------------------------------------------------------------- renderer */

export class Renderer {
  private bg: HTMLCanvasElement
  private vignette: HTMLCanvasElement

  constructor(
    private proc: Process,
    private world: World
  ) {
    this.bg = document.createElement("canvas")
    this.bg.width = VIEW_W
    this.bg.height = VIEW_H
    this.vignette = document.createElement("canvas")
    this.vignette.width = VIEW_W
    this.vignette.height = VIEW_H
    this.buildBackground()
    this.buildVignette()
  }

  private buildBackground() {
    const ctx = this.bg.getContext("2d")!
    const { map } = this.world
    rect(ctx, "#14162a", 0, 0, VIEW_W, VIEW_H)
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y][x]
        const roomId = map.roomAt(x, y)
        const room = this.proc.rooms.find((r) => r.id === roomId)
        if (t === "#") {
          wallTile(ctx, x, y, y === 0 && x % 3 === 2 && x > 0 && x < map.w - 1)
        } else if (t === "+") {
          floorTile(ctx, "#8a8a98", x, y, false)
          doorTile(ctx, x, y)
        } else {
          if (room) floorTile(ctx, room.color, x, y, true)
          else floorTile(ctx, "#9a9cae", x, y, false)
          if ("dspcrt".includes(t)) drawProp(ctx, t, x, y)
        }
      }
    }
    // room signs above doors
    for (let y = 0; y < map.h; y++)
      for (let x = 0; x < map.w; x++) {
        if (map.tiles[y][x] !== "+") continue
        const rid = map.roomAt(x, y - 1) ?? map.roomAt(x, y + 1)
        const room = this.proc.rooms.find((r) => r.id === rid)
        if (!room) continue
        const w = textWidth(room.label) + 4
        const sx = Math.round(x * TILE + TILE / 2 - w / 2)
        const wallAbove = map.tiles[y - 1]?.[x] === "#"
        const ty = wallAbove ? y * TILE - 8 : y * TILE + TILE + 1
        rect(ctx, "#1a1c30", sx, ty, w, 7)
        rect(ctx, room.color, sx, ty, w, 1)
        drawText(ctx, room.label, sx + 2, ty + 1, "#fff")
      }
  }

  private buildVignette() {
    const ctx = this.vignette.getContext("2d")!
    const g = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.35,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_W * 0.62
    )
    g.addColorStop(0, "rgba(10,10,30,0)")
    g.addColorStop(1, "rgba(10,10,30,0.55)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    opts: {
      targetNpc: string | null
      nearNpc: string | null
      talkingNpc: string | null
      showPlayer: boolean
    }
  ) {
    const w = this.world
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.bg, 0, 0)

    // hover marker
    if (w.hover && !w.map.isSolid(w.hover[0], w.hover[1])) {
      const [hx, hy] = w.hover.map((v) => v * TILE)
      ctx.fillStyle = "rgba(255,255,255,.9)"
      for (const [ox, oy] of [
        [0, 0],
        [13, 0],
        [0, 13],
        [13, 13],
      ]) {
        rect(ctx, "#ffd866", hx + ox, hy + oy, 3, 1)
        rect(ctx, "#ffd866", hx + ox + (ox ? 2 : 0), hy + oy, 1, 3)
      }
    }
    // path dots
    for (const [x, y] of w.path)
      rect(ctx, "rgba(255,216,102,.7)", x * TILE + 7, y * TILE + 7, 2, 2)

    // dust
    for (const d of w.dust) {
      const k = d.age / 0.35
      rect(
        ctx,
        `rgba(230,230,240,${0.5 * (1 - k)})`,
        d.x * TILE + 6,
        d.y * TILE + 13 - k * 3,
        3,
        2
      )
    }

    // sprites sorted by y
    type Spr = { y: number; draw: () => void }
    const sprites: Spr[] = []
    for (const [id, n] of Object.entries(this.proc.npcs)) {
      const bob = Math.round(Math.sin(w.time * 2 + n.at[0]) * 0.5 + 0.5)
      let facing = n.facing ?? "down"
      if (opts.talkingNpc === id) {
        const dx = w.x - n.at[0]
        const dy = w.y - n.at[1]
        facing =
          Math.abs(dx) > Math.abs(dy)
            ? dx < 0
              ? "left"
              : "right"
            : dy < 0
              ? "up"
              : "down"
      }
      sprites.push({
        y: n.at[1],
        draw: () => {
          drawCharacter(
            ctx,
            n.look,
            facing,
            0,
            n.at[0] * TILE,
            n.at[1] * TILE - bob
          )
          if (opts.targetNpc === id) {
            const b = Math.round(Math.sin(w.time * 5) * 1.5)
            const cx = n.at[0] * TILE + 8
            const cy = n.at[1] * TILE - 8 + b
            rect(ctx, "#1a1c30", cx - 3, cy - 2, 6, 9)
            rect(ctx, "#ffd866", cx - 2, cy - 1, 4, 5)
            rect(ctx, "#ffd866", cx - 1, cy + 5, 2, 1)
            rect(ctx, "#1a1c30", cx - 1, cy, 2, 2)
            rect(ctx, "#1a1c30", cx - 1, cy + 3, 2, 1)
          }
        },
      })
    }
    if (opts.showPlayer) {
      const [dx, dy] = w.drawPos
      const walkFrame = w.moving ? Math.floor(w.moving.t / 0.06) % 2 : 0
      sprites.push({
        y: dy,
        draw: () =>
          drawCharacter(
            ctx,
            PLAYER_LOOK,
            w.facing,
            walkFrame,
            Math.round(dx * TILE),
            Math.round(dy * TILE),
            true
          ),
      })
    }
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw())

    // interaction prompt
    if (opts.nearNpc && !opts.talkingNpc) {
      const n = this.proc.npcs[opts.nearNpc]
      const label = "[E] SPRECHEN"
      const lw = textWidth(label) + 4
      const lx = Math.max(
        1,
        Math.min(VIEW_W - lw - 1, n.at[0] * TILE + 8 - lw / 2)
      )
      const ly = n.at[1] * TILE - 12
      rect(ctx, "#1a1c30", lx, ly, lw, 9)
      rect(ctx, "#ffd866", lx, ly, lw, 1)
      drawText(ctx, label, lx + 2, ly + 2, "#fff")
    }

    // popups
    for (const p of w.popups) {
      const k = p.age / 1.2
      drawText(
        ctx,
        p.text,
        p.x * TILE + 2,
        p.y * TILE - 6 - k * 14,
        p.color,
        "#000"
      )
    }

    ctx.drawImage(this.vignette, 0, 0)
  }
}
