import type { Metadata } from "next"
import { Editor } from "../_components/editor/Editor"
import { editorEnabled } from "../_game/store"

export const metadata: Metadata = {
  title: "Spiel-Editor",
  robots: { index: false, follow: false },
}
export const dynamic = "force-dynamic"

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const g = (await searchParams).game
  return (
    <Editor canSave={editorEnabled()} initialId={Array.isArray(g) ? g[0] : g} />
  )
}
