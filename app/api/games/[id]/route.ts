import { checkGameFile, LIMITS } from "../../../_game/guard"
import { editorEnabled, readGame, saveGame } from "../../../_game/store"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const found = await readGame((await params).id)
  if (!found) return Response.json({ error: "not found" }, { status: 404 })
  // never hand out a file that is not a well-formed game (e.g. edited by hand)
  const malformed = checkGameFile(found.proc)
  if (malformed.length)
    return Response.json({ errors: malformed }, { status: 422 })
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
  if (
    !(req.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("application/json")
  )
    return Response.json(
      { errors: ["content-type must be application/json"] },
      { status: 415 }
    )
  const declared = Number(req.headers.get("content-length") ?? 0)
  if (declared > LIMITS.bytes)
    return Response.json({ errors: ["game too large"] }, { status: 413 })
  const text = await req.text()
  if (new TextEncoder().encode(text).length > LIMITS.bytes)
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
