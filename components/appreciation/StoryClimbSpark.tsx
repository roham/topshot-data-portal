// StoryClimbSpark — a real, time-ordered sparkline of a single serial's cleared
// sales. Pure SVG server component (no client JS, no recharts): renders an area
// + line with a hollow "first sale" dot and a filled "last sale" dot, plus a
// faint peak marker when the high is above the last sale. The visual IS the
// story — bought low, climbed, sold high.

import type { SalePoint } from "@/lib/supabase/queries/appreciation-events";

interface Props {
  path: SalePoint[];
  width?: number;
  height?: number;
  color?: string;
  id: string; // unique gradient id (moment_id)
}

export function StoryClimbSpark({ path, width = 260, height = 64, color = "#34d399", id }: Props) {
  // Need ≥2 points to draw a line; fall back to a flat baseline otherwise.
  const pts = path.filter((p) => p.price > 0);
  if (pts.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-[var(--surface-2)]/40 font-mono text-[9px] text-[var(--text-faint)]"
        style={{ width: "100%", height }}
      >
        single sale — no path
      </div>
    );
  }

  const padY = 6;
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const n = pts.length;

  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * (width - 2)) + 1;
  const y = (price: number) => padY + (1 - (price - min) / range) * (height - 2 * padY);

  const linePts = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.price).toFixed(1)}`);
  const linePath = `M ${linePts.join(" L ")}`;
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)},${height} L ${x(0).toFixed(1)},${height} Z`;

  const peakIdx = prices.indexOf(max);
  const gid = `spark-${id}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="sale price path">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {/* peak marker (only if the peak isn't the last point) */}
      {peakIdx !== n - 1 && (
        <circle cx={x(peakIdx)} cy={y(max)} r={2} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
      )}
      {/* first sale — hollow */}
      <circle cx={x(0)} cy={y(pts[0].price)} r={2.5} fill="var(--surface-1)" stroke="var(--text-faint)" strokeWidth={1.25} />
      {/* last sale — filled */}
      <circle cx={x(n - 1)} cy={y(pts[n - 1].price)} r={3} fill={color} />
    </svg>
  );
}
