import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GameClient } from "./_components/GameClient"
import { Menu } from "./_components/Menu"
import { loadProcess } from "./_game/load"
import { DEFAULT_UI } from "./_game/schema"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  clip,
  siteUrl,
} from "./_game/site"
import { editorEnabled, listGames } from "./_game/store"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function gameName(searchParams: Props["searchParams"]) {
  const g = (await searchParams).game
  return Array.isArray(g) ? g[0] : g
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const name = await gameName(searchParams)
  // start page: the defaults from layout.tsx apply
  if (!name) return { title: { absolute: `${SITE_NAME} – ${SITE_TAGLINE}` } }
  const loaded = await loadProcess(name)
  if (!loaded.ok)
    return {
      title: "Spiel nicht gefunden",
      robots: { index: false, follow: false },
    }

  const { proc } = loaded
  const description = clip(
    [proc.subtitle, proc.intro?.[0]].filter(Boolean).join(". ")
  )
  const url = `/?game=${name}`
  const image = {
    url: `/og?game=${name}`,
    width: 1200,
    height: 630,
    alt: proc.title,
  }
  const shareTitle = `${proc.title} – ${SITE_NAME}`
  return {
    title: proc.title,
    description,
    alternates: { canonical: url },
    // games made in the editor are private drafts: shareable, but not indexed
    robots:
      loaded.source === "saved"
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "de_DE",
      title: shareTitle,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [image.url],
    },
  }
}

/** Structured data for search engines (schema.org). */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

export default async function GamePage({ searchParams }: Props) {
  const name = await gameName(searchParams)
  const base = siteUrl()

  if (!name)
    return (
      <>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            url: base.toString(),
            inLanguage: "de",
            applicationCategory: "GameApplication",
            genre: "Lernspiel",
            operatingSystem: "Alle (Browser)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          }}
        />
        <Menu games={await listGames()} canEdit={editorEnabled()} />
      </>
    )

  const loaded = await loadProcess(name)
  if (!loaded.ok) {
    if (loaded.missing) notFound()
    return (
      <main style={{ padding: 24, fontFamily: "monospace", color: "#eee" }}>
        <h1>{DEFAULT_UI.loadError}</h1>
        <p>{loaded.name}</p>
        <ul>
          {loaded.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </main>
    )
  }
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: loaded.proc.title,
          description: clip(
            [loaded.proc.subtitle, ...(loaded.proc.intro ?? [])]
              .map((t) => t.replace(/[.!?]+$/, ""))
              .join(". ") + ".",
            300
          ),
          url: new URL(`/?game=${name}`, base).toString(),
          image: new URL(`/og?game=${name}`, base).toString(),
          inLanguage: "de",
          genre: "Lernspiel",
          gamePlatform: "Webbrowser",
          applicationCategory: "GameApplication",
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: base.toString(),
          },
        }}
      />
      <GameClient key={loaded.proc.id} proc={loaded.proc} />
    </>
  )
}
