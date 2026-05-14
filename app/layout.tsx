import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TOPSHOT TERMINAL — collector-first market intelligence",
  description:
    "Real numbers, real names, real moves. Live NBA Top Shot market data for the financial gambler-collector. Built on the public GraphQL API.",
  openGraph: {
    title: "TOPSHOT TERMINAL",
    description: "Real numbers, real names, real moves.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <header className="border-b border-[var(--border)] sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur">
          <div className="max-w-portal mx-auto px-4 sm:px-6 h-12 flex items-center gap-4 sm:gap-6">
            <Link href="/" className="font-mono text-sm tracking-tight font-semibold whitespace-nowrap">
              TOPSHOT<span className="text-[var(--accent)]">·</span>TERMINAL
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-xs text-[var(--text-dim)]">
              <Link href="/" className="hover:text-[var(--text)]">Market</Link>
              <Link href="/players" className="hover:text-[var(--text)]">Players</Link>
              <Link href="/teams" className="hover:text-[var(--text)]">Teams</Link>
              <Link href="/sets" className="hover:text-[var(--text)]">Sets</Link>
              <Link href="/collectors" className="hover:text-[var(--text)]">Collectors</Link>
              <Link href="/rules" className="hover:text-[var(--text)]">Rules</Link>
              <Link href="/methodology" className="hover:text-[var(--text)]">Methodology</Link>
            </nav>
            <div className="ml-auto flex items-center gap-2 text-[10px] sm:text-xs text-[var(--text-faint)]">
              <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[var(--up)] inline-block" />
              <span className="tnum hidden sm:inline">LIVE · public-api.nbatopshot.com</span>
              <span className="tnum sm:hidden">LIVE</span>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] text-xs text-[var(--text-faint)] py-6 mt-12">
          <div className="max-w-portal mx-auto px-4 sm:px-6 flex flex-wrap gap-x-6 gap-y-1">
            <span>Built on the public NBA Top Shot GraphQL API. No affiliation with Dapper Labs / NBA Top Shot.</span>
            <span className="sm:ml-auto">Numbers update on each pageview. Cache ≤60s.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
