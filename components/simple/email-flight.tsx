"use client"

import * as React from "react"
import { Mail } from "lucide-react"

export function EmailFlight({
  from,
  to,
  onDone,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  onDone: () => void
}) {
  const [pos, setPos] = React.useState(from)

  React.useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPos(to))
    })
    const timer = setTimeout(onDone, 1300)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="absolute z-20 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-lg ring-2 ring-sky-400 transition-[left,top] duration-[1100ms] ease-in-out dark:bg-slate-900"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <Mail className="size-4.5" />
    </div>
  )
}
