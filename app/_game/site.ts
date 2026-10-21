/** Site-wide constants for metadata (SEO, link previews). */
export const SITE_NAME = "devadventure"
export const SITE_TAGLINE = "Prozesse spielerisch lernen"
export const SITE_DESCRIPTION =
  "devadventure ist ein Retro-Büro-Adventure im Browser: Laufe durch das Gebäude, sprich mit Kolleginnen und Kollegen und lerne dabei Geschäftsprozesse kennen. Spiele fertige Prozesse oder gestalte mit dem Editor dein eigenes Spiel."

/** "Buy me a coffee" link shown on the start screen. */
export const COFFEE_URL = "https://ko-fi.com/jzakotnik"

/**
 * Public base URL for absolute links in metadata. Set NEXT_PUBLIC_SITE_URL
 * (e.g. https://quest.example.com) in production; Vercel's production URL is
 * used as a fallback.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const raw =
    explicit || (vercel ? `https://${vercel}` : "http://localhost:3000")
  try {
    return new URL(raw)
  } catch {
    return new URL("http://localhost:3000")
  }
}

/** Shortens text for meta descriptions (search results show ~155 characters). */
export function clip(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return (
    cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : max - 1) +
    "…"
  )
}
