import type { Process } from "./schema"

/** Tile glyphs used in `map.layout`. */
export const MAP_LEGEND: Record<string, string> = {
  "#": "wall",
  _: "room floor",
  ".": "corridor",
  "+": "door",
  d: "desk",
  s: "shelf",
  p: "plant",
  c: "coffee machine",
  r: "printer",
  t: "table",
}

const SOLID = new Set(["#", "d", "s", "p", "c", "r", "t"])

export const TILE = 16

export interface GameMap {
  w: number
  h: number
  tiles: string[][]
  roomAt: (x: number, y: number) => string | null
  isSolid: (x: number, y: number) => boolean
}

export function buildMap(proc: Process): GameMap {
  const tiles = proc.map.layout.map((row) => row.split(""))
  const h = tiles.length
  const w = tiles[0]?.length ?? 0
  const isSolid = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h || SOLID.has(tiles[y][x])
  const roomAt = (x: number, y: number) => {
    for (const r of proc.rooms) {
      const [rx, ry, rw, rh] = r.rect
      if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return r.id
    }
    return null
  }
  return { w, h, tiles, roomAt, isSolid }
}

/** Breadth-first path from a to b over walkable tiles (excluding `blocked`). */
export function findPath(
  map: GameMap,
  from: [number, number],
  goals: Array<[number, number]>,
  blocked: Set<string>
): Array<[number, number]> | null {
  const key = (x: number, y: number) => `${x},${y}`
  const goalKeys = new Set(goals.map(([x, y]) => key(x, y)))
  if (goalKeys.has(key(...from))) return []
  const prev = new Map<string, string | null>([[key(...from), null]])
  const queue: Array<[number, number]> = [from]
  const dirs: Array<[number, number]> = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]
  while (queue.length) {
    const [cx, cy] = queue.shift()!
    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      const k = key(nx, ny)
      if (prev.has(k) || map.isSolid(nx, ny) || blocked.has(k)) continue
      prev.set(k, key(cx, cy))
      if (goalKeys.has(k)) {
        const path: Array<[number, number]> = []
        let cur: string | null = k
        while (cur && cur !== key(...from)) {
          const [px, py] = cur.split(",").map(Number)
          path.unshift([px, py])
          cur = prev.get(cur) ?? null
        }
        return path
      }
      queue.push([nx, ny])
    }
  }
  return null
}
