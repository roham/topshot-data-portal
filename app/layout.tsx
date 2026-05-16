import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { TopNav } from "@/components/TopNav";
import { EtlFreshnessBadge } from "@/components/EtlFreshnessBadge";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-sans-stack", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TS·PORTAL — NBA Top Shot data terminal",
  description:
    "Dapper-internal market intelligence for NBA Top Shot. Real numbers, real names, real moves — for the trader-collector.",
  openGraph: {
    title: "TS·PORTAL",
    description: "NBA Top Shot data terminal.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased">
        <Providers>
          <TopNav
            freshness={
              <Suspense fallback={null}>
                <EtlFreshnessBadge />
              </Suspense>
            }
          />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-faint)] py-3 mt-12 font-mono">
            <div className="max-w-[1440px] mx-auto px-4 flex items-center gap-4">
              <span>Dapper-internal data portal for NBA Top Shot.</span>
              <Link href="/methodology" className="hover:text-[var(--text)] tracking-data-label">methodology</Link>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
