import type { Metadata } from "next"
import { Editor } from "../_components/editor/Editor"
import { editorEnabled } from "../_game/store"

export const metadata: Metadata = { title: "Spiel-Editor" }
export const dynamic = "force-dynamic"

export default function EditorPage() {
  return <Editor canSave={editorEnabled()} />
}
