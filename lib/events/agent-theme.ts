import { Building2, Landmark, Globe2, ShieldCheck, type LucideIcon } from "lucide-react"
import type { AgentId } from "./types"

export type AgentTheme = {
  icon: LucideIcon
  label: string
  short: string
  /** solid avatar background + white icon */
  solid: string
  /** soft card background + border */
  soft: string
  /** accent border-left stripe */
  stripe: string
  text: string
  ring: string
  dot: string
  /** SVG stroke color for connection lines. */
  stroke: string
}

export const AGENT_THEME: Record<AgentId, AgentTheme> = {
  PM: {
    icon: Building2,
    label: "Projektleitung",
    short: "PM",
    solid: "bg-indigo-500",
    soft: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900",
    stripe: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-400",
    dot: "bg-indigo-500",
    stroke: "stroke-indigo-500",
  },
  BMZ: {
    icon: Landmark,
    label: "BMZ",
    short: "BMZ",
    solid: "bg-violet-500",
    soft: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900",
    stripe: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-400",
    dot: "bg-violet-500",
    stroke: "stroke-violet-500",
  },
  PEA: {
    icon: Globe2,
    label: "Partner (PEA)",
    short: "PEA",
    solid: "bg-amber-500",
    soft: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    stripe: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-400",
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
  },
  TEAMLEITUNG: {
    icon: ShieldCheck,
    label: "Teamleitung",
    short: "Teamleitung",
    solid: "bg-emerald-500",
    soft: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    stripe: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-400",
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
  },
}
