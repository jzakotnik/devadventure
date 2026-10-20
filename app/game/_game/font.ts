/** 3x5 pixel font (A-Z, 0-9, a few symbols). Each glyph = 5 rows of 3 bits. */
const G: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5],
  B: [6, 5, 6, 5, 6],
  C: [3, 4, 4, 4, 3],
  D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3],
  H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7],
  J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5],
  L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5],
  N: [6, 5, 5, 5, 5],
  O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3],
  R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6],
  T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7],
  V: [5, 5, 5, 5, 2],
  W: [5, 5, 7, 7, 5],
  X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7],
  "0": [7, 5, 5, 5, 7],
  "1": [2, 6, 2, 2, 7],
  "2": [6, 1, 2, 4, 7],
  "3": [6, 1, 2, 1, 6],
  "4": [5, 5, 7, 1, 1],
  "5": [7, 4, 6, 1, 6],
  "6": [3, 4, 7, 5, 7],
  "7": [7, 1, 2, 2, 2],
  "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 6],
  "+": [0, 2, 7, 2, 0],
  "-": [0, 0, 7, 0, 0],
  "!": [2, 2, 2, 0, 2],
  "?": [6, 1, 2, 0, 2],
  "/": [1, 1, 2, 4, 4],
  ":": [0, 2, 0, 2, 0],
  "(": [1, 2, 2, 2, 1],
  ")": [4, 2, 2, 2, 4],
  "[": [3, 2, 2, 2, 3],
  "]": [6, 2, 2, 2, 6],
  "*": [5, 2, 7, 2, 5],
  ".": [0, 0, 0, 0, 2],
}
const UMLAUT: Record<string, string> = { Ä: "A", Ö: "O", Ü: "U" }

export function textWidth(s: string): number {
  return s.length * 4 - 1
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: string,
  shadow?: string
) {
  const pass = (ox: number, oy: number, c: string) => {
    ctx.fillStyle = c
    let cx = x + ox
    for (const raw of s.toUpperCase()) {
      const ch = UMLAUT[raw] ?? raw
      const rows = G[ch]
      if (rows) {
        for (let r = 0; r < 5; r++)
          for (let b = 0; b < 3; b++)
            if (rows[r] & (4 >> b)) ctx.fillRect(cx + b, y + oy + r, 1, 1)
        if (UMLAUT[raw]) {
          ctx.fillRect(cx, y + oy - 2, 1, 1)
          ctx.fillRect(cx + 2, y + oy - 2, 1, 1)
        }
      }
      cx += 4
    }
  }
  if (shadow) pass(0, 1, shadow)
  pass(0, 0, color)
}
