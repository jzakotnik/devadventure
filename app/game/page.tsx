import type { Metadata } from "next"
import { GameClient } from "./_components/GameClient"

export const metadata: Metadata = {
  title: "Büro-Quest",
  description: "Lerne den Modulvorschlag-Prozess spielerisch kennen.",
}

export default function GamePage() {
  return <GameClient />
}
