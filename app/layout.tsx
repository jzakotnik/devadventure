import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FZ Prozess Quest",
  description: "Lerne den Modulvorschlag-Prozess spielerisch kennen.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
