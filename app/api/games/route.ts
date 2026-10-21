import { editorEnabled, listGames } from "../../_game/store"

export async function GET() {
  return Response.json({ games: await listGames(), canSave: editorEnabled() })
}
