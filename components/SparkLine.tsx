// V4-iter-1 — minimal inline-SVG sparkline for the aggregate-economy strip.
// Server-renderable; zero client JS; no charting deps. Sits next to the
// existing `components/primitives/Sparkline.tsx` (which uses visx) — we
// don't reuse that one because (a) the v1 strip is server-only and we want
// to avoid the visx client cost on first paint, (b) the strip's mobile
// thicker-stroke + degraded-state visual is data-state-driven, not
// component-flag-driven, per design.md Q3 / Q2.
//
// Variants:
//   - "full"     → 1px (desktop) / 2px (mobile) solid stroke, up/down/flat color
//   - "degraded" → 1.5px `--text-faint` stroke, no fill, no dots (the 2-11 ticks state)
//
// Width/height are caller-driven so the strip can swap the desktop 64×24
// for mobile 80×20. Color rule = sign of (last − first), matching the
// existing primitives/Sparkline.tsx so the visual reads consistent.

interface SparkLineProps {
  data: number[];
  variant?: "full" | "degraded";
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function SparkLine({
  data,
  variant = "full",
  width = 64,
  height = 24,
  strokeWidth,
  className,
}: SparkLineProps) {
  if (!data || data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const baseColor =
    variant === "degraded"
      ? "var(--text-faint)"
      : last > first
        ? "var(--up)"
        : last < first
          ? "var(--down)"
          : "var(--neutral-delta, var(--text-faint))";

  const sw =
    strokeWidth != null ? strokeWidth : variant === "degraded" ? 1.5 : 1;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max === min ? 1 : max - min;
  const padX = 1;
  const padY = 1;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = data.length === 1 ? 0 : innerW / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((v - min) / span) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M${points[0]} L${points.slice(1).join(" L")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={className}
      data-spark-variant={variant}
    >
      <path
        d={d}
        fill="none"
        stroke={baseColor}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
