import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "'Courier New', monospace",
        fontWeight: 700,
        color: "#f4f1e6",
        textAlign: "center",
        padding: 16,
      }}
    >
      <h1 style={{ color: "#ffd866", margin: 0 }}>
        404 – Level nicht gefunden
      </h1>
      <p style={{ margin: 0 }}>Dieses Spiel gibt es nicht (mehr).</p>
      <Link href="/" style={{ color: "#9ac8ff" }}>
        ← zurück zum Menü
      </Link>
    </main>
  )
}
