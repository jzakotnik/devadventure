"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Workflow, LayoutGrid, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

const VIEWS = [
  { href: "/", label: "Ausführlich", icon: Workflow },
  { href: "/simple", label: "Einfach", icon: LayoutGrid },
  { href: "/mail", label: "E-Mail", icon: Mail },
]

export function ViewSwitcher() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-1 rounded-full border p-1 text-xs font-medium">
      {VIEWS.map((v) => {
        const active = pathname === v.href
        const Icon = v.icon
        return (
          <Link
            key={v.href}
            href={v.href}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="size-3.5" />
            {v.label}
          </Link>
        )
      })}
    </div>
  )
}
