import { NextResponse } from "next/server"
import { startMailWatchers, getStatuses } from "@/lib/mail/store"

export const dynamic = "force-dynamic"

export async function GET() {
  startMailWatchers()
  return NextResponse.json({ statuses: getStatuses() })
}
