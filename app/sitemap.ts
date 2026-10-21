import type { MetadataRoute } from "next"
import { siteUrl } from "./_game/site"
import { listGames } from "./_game/store"

export const dynamic = "force-dynamic"

/** Start page plus every built-in game (games saved in the editor are not public). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const games = (await listGames()).filter((g) => g.source === "bundled")
  return [
    {
      url: new URL("/", base).toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...games.map((g) => ({
      url: new URL(`/?game=${g.id}`, base).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]
}
