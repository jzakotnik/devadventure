import { buildMap, findPath, type GameMap } from "./map"
import type { Dir, Process } from "./schema"

const MOVE_TIME = 0.12

const DIRS: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export interface Popup {
  text: string
  x: number
  y: number
  age: number
  color: string
}

export interface Dust {
  x: number
  y: number
  age: number
}

/** Mutable real-time world: player movement, auto-walk, particles. */
export class World {
  map: GameMap
  x: number
  y: number
  facing: Dir = "down"
  moving: { fx: number; fy: number; t: number } | null = null
  path: Array<[number, number]> = []
  /** NPC to talk to once the auto-walk arrives. */
  pendingTalk: string | null = null
  held: Dir[] = []
  time = 0
  popups: Popup[] = []
  dust: Dust[] = []
  hover: [number, number] | null = null
  /** Fires on every completed step (for sound). */
  onStep?: () => void
  onDoor?: () => void

  constructor(private proc: Process) {
    this.map = buildMap(proc)
    this.x = proc.map.start[0]
    this.y = proc.map.start[1]
  }

  reset() {
    this.x = this.proc.map.start[0]
    this.y = this.proc.map.start[1]
    this.facing = "down"
    this.moving = null
    this.path = []
    this.pendingTalk = null
    this.held = []
    this.popups = []
  }

  npcAt(x: number, y: number): string | null {
    for (const [id, n] of Object.entries(this.proc.npcs))
      if (n.at[0] === x && n.at[1] === y) return id
    return null
  }

  private blockedByNpc(): Set<string> {
    return new Set(
      Object.values(this.proc.npcs).map((n) => `${n.at[0]},${n.at[1]}`)
    )
  }

  /** Screen position of the player in tile units (interpolated while moving). */
  get drawPos(): [number, number] {
    if (!this.moving) return [this.x, this.y]
    const k = Math.min(1, this.moving.t / MOVE_TIME)
    return [
      this.moving.fx + (this.x - this.moving.fx) * k,
      this.moving.fy + (this.y - this.moving.fy) * k,
    ]
  }

  adjacentNpc(): string | null {
    if (this.moving) return null
    const [dx, dy] = DIRS[this.facing]
    const facing = this.npcAt(this.x + dx, this.y + dy)
    if (facing) return facing
    for (const [ddx, ddy] of Object.values(DIRS)) {
      const id = this.npcAt(this.x + ddx, this.y + ddy)
      if (id) return id
    }
    return null
  }

  faceToward(tx: number, ty: number) {
    const dx = tx - this.x
    const dy = ty - this.y
    this.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "left"
          : "right"
        : dy < 0
          ? "up"
          : "down"
  }

  press(d: Dir) {
    this.held = [...this.held.filter((h) => h !== d), d]
    this.path = []
    this.pendingTalk = null
  }

  release(d: Dir) {
    this.held = this.held.filter((h) => h !== d)
  }

  /** Mouse: walk to a tile, or to an NPC and talk. */
  clickTile(tx: number, ty: number) {
    const npc = this.npcAt(tx, ty)
    const blocked = this.blockedByNpc()
    const origin: [number, number] = [this.x, this.y]
    if (npc) {
      const goals = (Object.values(DIRS) as Array<[number, number]>)
        .map(([dx, dy]) => [tx + dx, ty + dy] as [number, number])
        .filter(
          ([x, y]) => !this.map.isSolid(x, y) && !blocked.has(`${x},${y}`)
        )
      const p = findPath(this.map, origin, goals, blocked)
      if (p) {
        this.path = p
        this.pendingTalk = npc
      }
      return
    }
    if (this.map.isSolid(tx, ty)) return
    const p = findPath(this.map, origin, [[tx, ty]], blocked)
    if (p) {
      this.path = p
      this.pendingTalk = null
    }
  }

  addPopup(text: string, color: string) {
    this.popups.push({ text, x: this.x, y: this.y, age: 0, color })
  }

  /** Advance the simulation; returns an NPC id when an auto-walk wants to start a dialog. */
  update(dt: number, frozen: boolean): string | null {
    this.time += dt
    for (const p of this.popups) p.age += dt
    this.popups = this.popups.filter((p) => p.age < 1.2)
    for (const d of this.dust) d.age += dt
    this.dust = this.dust.filter((d) => d.age < 0.35)
    if (frozen) return null

    if (this.moving) {
      this.moving.t += dt
      if (this.moving.t >= MOVE_TIME) {
        this.moving = null
        this.onStep?.()
        if (this.map.tiles[this.y][this.x] === "+") this.onDoor?.()
      }
    }
    if (!this.moving) {
      let next: Dir | null = null
      if (this.held.length) next = this.held[this.held.length - 1]
      else if (this.path.length) {
        const [px, py] = this.path[0]
        next =
          px > this.x
            ? "right"
            : px < this.x
              ? "left"
              : py > this.y
                ? "down"
                : "up"
      }
      if (next) {
        this.facing = next
        const [dx, dy] = DIRS[next]
        const nx = this.x + dx
        const ny = this.y + dy
        if (!this.map.isSolid(nx, ny) && !this.npcAt(nx, ny)) {
          this.dust.push({ x: this.x, y: this.y, age: 0 })
          this.moving = { fx: this.x, fy: this.y, t: 0 }
          this.x = nx
          this.y = ny
          if (this.path.length) this.path.shift()
        } else {
          this.path = []
        }
      } else if (this.pendingTalk) {
        const id = this.pendingTalk
        this.pendingTalk = null
        const n = this.proc.npcs[id]
        if (Math.abs(n.at[0] - this.x) + Math.abs(n.at[1] - this.y) === 1) {
          this.faceToward(n.at[0], n.at[1])
          return id
        }
      }
    }
    return null
  }
}
