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
};

export default nextConfig;
