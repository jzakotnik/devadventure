"use client"

import { useEffect, useRef } from "react"
import { drawCharacter } from "../_game/render"
import type { NpcLook } from "../_game/schema"

export function Portrait({
  look,
  className,
}: {
  look: NpcLook
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, 16, 16)
    ctx.fillStyle = "#2a2f55"
    ctx.fillRect(0, 0, 16, 16)
    drawCharacter(ctx, look, "down", 0, 0, 1)
  }, [look])
  return <canvas ref={ref} width={16} height={16} className={className} />
}
