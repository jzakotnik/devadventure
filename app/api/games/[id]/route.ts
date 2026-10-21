import { editorEnabled, readGame, saveGame } from "../../../_game/store"

const MAX_BYTES = 1_000_000

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const found = await readGame((await params).id)
  if (!found) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json(found)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!editorEnabled())
    return Response.json(
      { errors: ["saving is disabled (set GAME_EDITOR=1)"] },
      { status: 403 }
    )
  const text = await req.text()
  if (text.length > MAX_BYTES)
    return Response.json({ errors: ["game too large"] }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ errors: ["invalid JSON"] }, { status: 400 })
  }
  const errors = await saveGame((await params).id, body)
  return errors.length
    ? Response.json({ errors }, { status: 400 })
    : Response.json({ ok: true })
}
