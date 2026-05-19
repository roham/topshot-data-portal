import type { NextConfig } from "next";

// V2: NBA + Top Shot CDN allowlist for next/image. Both are official
// sources for licensed imagery the portal surfaces. No synthesized art.
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nba.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.nbatopshot.com", pathname: "/**" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: [
      "recharts",
      "@visx/scale",
      "@visx/shape",
      "@visx/group",
      "@visx/axis",
      "@visx/curve",
      "@visx/tooltip",
      "@visx/hierarchy",
      "lucide-react",
    ],
  },
  // CDN cache headers for the homepage. Vercel reads s-maxage to drive its
  // edge cache; stale-while-revalidate keeps the previous payload in front
  // of viewers while a background revalidation runs. Each query-string
  // variant (?w=24h / 7d / 30d / 90d / 1y / all) gets its own cache key.
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },

  // 301 redirects for routes retired by the 2026-05-19 IA pass. These were
  // pure ComingSoon placeholders with no shipped functionality — killing
  // them rather than carrying placeholder pages forward. Bookmarks land on
  // the right surface in the new five-lane IA.
  async redirects() {
    return [
      // Singular aliases / duplicates → canonical plural or lane home
      { source: "/parallel", destination: "/parallels", permanent: true },
      { source: "/tier", destination: "/indices", permanent: true },
      { source: "/series", destination: "/indices", permanent: true },
      { source: "/teams", destination: "/indices", permanent: true },
      { source: "/movement", destination: "/movers", permanent: true },
      // Pure placeholders → most-relevant lane home
      { source: "/specials", destination: "/", permanent: true },
      { source: "/archive", destination: "/on-this-day", permanent: true },
      { source: "/changelog", destination: "/methodology", permanent: true },
      { source: "/alerts", destination: "/sniper", permanent: true },
      { source: "/watching", destination: "/portfolio", permanent: true },
      { source: "/anomalies", destination: "/feed", permanent: true },
      // Duplicate index detail route
      { source: "/index/:code", destination: "/indices/:code", permanent: true },
    ];
  },
};

export default nextConfig;
