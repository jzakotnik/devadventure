"use client"

import * as React from "react"

export function ElapsedTimer({ since }: { since: string }) {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const seconds = Math.max(0, Math.round((now - new Date(since).getTime()) / 1000))
  return <span>Seit {seconds}s</span>
}
