import { NextRequest } from "next/server";
import { getUserByUsername, fetchBagPage } from "@/lib/topshot/queries";

export const runtime = "nodejs";

function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] ?? c));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getUserByUsername(decodeURIComponent(username));
  if (!profile?.flowAddress) {
    return new Response("not found", { status: 404 });
  }
  const page = await fetchBagPage(profile.flowAddress, "", 60);
  const items = page.items;
  // Top players
  const players: Record<string, number> = {};
  for (const m of items) {
    const p = m.play?.stats?.playerName;
    if (p) players[p] = (players[p] ?? 0) + 1;
  }
  const top = Object.entries(players).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const total = page.totalCount ?? 0;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a0c"/>
      <stop offset="100%" stop-color="#14141a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="60" y="80" fill="#9a9aa8" font-family="ui-monospace, monospace" font-size="20" letter-spacing="2">TOPSHOT · TERMINAL</text>
  <text x="60" y="180" fill="#e8e8ee" font-family="ui-sans-serif, system-ui, sans-serif" font-size="72" font-weight="600">@${esc(profile.username)}</text>
  <text x="60" y="240" fill="#f59e0b" font-family="ui-monospace, monospace" font-size="36" font-weight="600">${total.toLocaleString()} moments</text>
  <text x="60" y="320" fill="#9a9aa8" font-family="ui-sans-serif, system-ui, sans-serif" font-size="24">Top players in visible bag:</text>
  ${top.map((t, i) => `<text x="60" y="${370 + i * 50}" fill="#e8e8ee" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">${esc(t[0])} <tspan fill="#9a9aa8" font-size="20">· ${t[1]}</tspan></text>`).join("")}
  <text x="60" y="560" fill="#6a6a78" font-family="ui-monospace, monospace" font-size="16">topshot-data-portal.vercel.app/u/${esc(profile.username)}</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
