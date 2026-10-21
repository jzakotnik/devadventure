import type { Metadata } from "next"
import { GameClient } from "./_components/GameClient"
import { DEFAULT_UI } from "./_game/schema"
import { Menu } from "./_components/Menu"
import { loadProcess } from "./_game/load"
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
  if (!name) return { title: "Prozess Quest" }
  const loaded = await loadProcess(name)
  if (!loaded.ok) return { title: "Spiel nicht gefunden" }
  return { title: loaded.proc.title, description: loaded.proc.subtitle }
}

export default async function GamePage({ searchParams }: Props) {
  const name = await gameName(searchParams)
  if (!name) return <Menu games={await listGames()} canEdit={editorEnabled()} />
  const loaded = await loadProcess(name)
  if (!loaded.ok) {
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
  return <GameClient key={loaded.proc.id} proc={loaded.proc} />
}
