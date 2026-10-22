import { ImageResponse } from "next/og"
import { SITE_NAME, SITE_TAGLINE } from "../_game/site"
import { ID_PATTERN, readGame } from "../_game/store"

/** Link-preview image: /og (generic) or /og?game=<id> (title of that game). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("game") ?? ""
  const found = ID_PATTERN.test(id) ? await readGame(id) : null
  const title = String(found?.proc.title ?? SITE_NAME)
    .slice(0, 60)
    .toUpperCase()
  const subtitle = String(found?.proc.subtitle ?? SITE_TAGLINE).slice(0, 120)
  const size =
    title.length > 22
      ? 64
      : title.length > 14
        ? 80
        : title.length > 10
          ? 96
          : 132

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 40%, #1f2250, #07070f 75%)",
        color: "#f4f1e6",
        fontFamily: "monospace",
        fontWeight: 700,
        padding: 60,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          letterSpacing: 8,
          color: "#9ac8ff",
          marginBottom: 24,
        }}
      >
        {found ? SITE_NAME.toUpperCase() : "▶ START"}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: 6,
          color: "#ffd866",
          textShadow: "7px 7px 0 #d84a4a",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          fontSize: 38,
          color: "#e6e6f0",
          maxWidth: 1000,
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 36,
          fontSize: 24,
          color: "#9aa0d8",
        }}
      >
        Retro-Büro-Adventure · im Browser spielbar
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "cache-control": "public, max-age=3600, s-maxage=3600" },
    }
  )
}
