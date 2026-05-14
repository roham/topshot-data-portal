import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
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
        <header className="border-b border-[var(--border)] sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur relative">
          <div className="max-w-portal mx-auto px-4 sm:px-6 h-12 flex items-center gap-4 sm:gap-6">
            <Link href="/" className="font-mono text-sm tracking-tight font-semibold whitespace-nowrap">
              TOPSHOT<span className="text-[var(--accent)]">·</span>TERMINAL
            </Link>
            <MobileNav />
            <nav className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-dim)] flex-wrap">
              <Link href="/" className="hover:text-[var(--text)]">Market</Link>
              <Link href="/movement" className="hover:text-[var(--text)]">Movement</Link>
              <Link href="/whales" className="hover:text-[var(--text)]">Whales</Link>
              <Link href="/specials" className="hover:text-[var(--text)]">Specials</Link>
              <Link href="/anomalies" className="hover:text-[var(--text)]">Anomalies</Link>
              <span className="text-[var(--text-faint)]">·</span>
              <Link href="/players" className="hover:text-[var(--text)]">Players</Link>
              <Link href="/teams" className="hover:text-[var(--text)]">Teams</Link>
              <Link href="/sets" className="hover:text-[var(--text)]">Sets</Link>
              <Link href="/leaderboards" className="hover:text-[var(--text)]">Ladders</Link>
              <span className="text-[var(--text-faint)]">·</span>
              <Link href="/collectors" className="hover:text-[var(--text)]">Collectors</Link>
              <Link href="/compare" className="hover:text-[var(--text)]">Compare</Link>
              <Link href="/watching" className="hover:text-[var(--text)]">Watching</Link>
              <span className="text-[var(--text-faint)]">·</span>
              <Link href="/trends" className="hover:text-[var(--text)]">Trends</Link>
              <Link href="/archive" className="hover:text-[var(--text)]">Archive</Link>
              <Link href="/on-this-day" className="hover:text-[var(--text)]">OnThisDay</Link>
              <span className="text-[var(--text-faint)]">·</span>
              <Link href="/rules" className="hover:text-[var(--text)]">Rules</Link>
              <Link href="/methodology" className="hover:text-[var(--text)]">Methodology</Link>
              <Link href="/changelog" className="hover:text-[var(--text)]">Changelog</Link>
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
            <span className="sm:ml-auto flex gap-3">
              <Link href="/api/stats" className="hover:text-[var(--text)]">/api/stats</Link>
              <Link href="/methodology" className="hover:text-[var(--text)]">methodology</Link>
              <Link href="/rules" className="hover:text-[var(--text)]">rules</Link>
              <span>· cache ≤60s</span>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
