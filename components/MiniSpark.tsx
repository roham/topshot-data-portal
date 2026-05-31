// Pure-SVG sparkline. Server-safe (no client JS). Normalizes a numeric series to
// a polyline + a soft gradient fill. Used in the appreciation gallery cards.

export function MiniSpark({ data, color, height = 56 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} className="rounded bg-[var(--surface-2)]/40" />;
  const W = 300;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - 3 - ((v - min) / range) * (H - 6);
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
