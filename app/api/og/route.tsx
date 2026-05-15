import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// V2 STAGE-2: generic OG card scaffold. Per-surface OG cards will land
// per-iter under app/api/og/<slug>/route.tsx using this as the design base.
//
// Query params:
//   title    — large headline (required for non-default)
//   subtitle — secondary line
//   stat     — single big tabular number rendered green-up / red-down via `up`
//   up       — "true" | "false" (drives stat color, default neutral)
//   note     — small footer note (typically the methodology disclosure)

export const runtime = "edge";

const PORTAL_FONT_INTER = "https://rsms.me/inter/font-files/Inter-SemiBold.woff?v=3.19";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "TOPSHOT TERMINAL";
  const subtitle = searchParams.get("subtitle") ?? "Dapper data portal for NBA Top Shot";
  const stat = searchParams.get("stat");
  const upParam = searchParams.get("up");
  const note = searchParams.get("note") ?? "data sampled from the public Top Shot GraphQL — methodology page documents every ceiling";

  const statColor =
    upParam === "true" ? "#34d399" : upParam === "false" ? "#f87171" : "#e8e8ee";

  let interSemibold: ArrayBuffer | null = null;
  try {
    const fontRes = await fetch(PORTAL_FONT_INTER);
    if (fontRes.ok) interSemibold = await fontRes.arrayBuffer();
  } catch {
    // graceful fallback to default font
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "#0a0a0c",
          color: "#e8e8ee",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: "#9a9aa8" }}>
          <span style={{ fontWeight: 600, color: "#e8e8ee" }}>TOPSHOT</span>
          <span style={{ color: "#f59e0b" }}>·</span>
          <span style={{ fontWeight: 600, color: "#e8e8ee" }}>TERMINAL</span>
          <span style={{ marginLeft: "auto", color: "#6a6a78", fontSize: 14 }}>
            topshot-data-portal.vercel.app
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05, color: "#e8e8ee", letterSpacing: -1.5 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 26, color: "#9a9aa8", lineHeight: 1.25, maxWidth: 980 }}>{subtitle}</div>
          )}
          {stat && (
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                color: statColor,
                fontVariantNumeric: "tabular-nums",
                fontFamily: "ui-monospace, monospace",
                marginTop: 12,
              }}
            >
              {stat}
            </div>
          )}
        </div>

        <div style={{ fontSize: 14, color: "#6a6a78", maxWidth: 1080, lineHeight: 1.35 }}>{note}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: interSemibold
        ? [
            {
              name: "Inter",
              data: interSemibold,
              weight: 600,
              style: "normal",
            },
          ]
        : undefined,
    },
  );
}
