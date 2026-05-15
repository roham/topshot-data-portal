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
};

export default nextConfig;
