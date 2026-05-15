import { LinePath } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { curveMonotoneX } from "@visx/curve";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  // Color rule: first→last delta. Override with `color`.
  color?: string;
}

// 72×20 micro line. No axes, no labels — sparkline by Tufte definition.
// Color rule: green if up over the series, red if down, grey if flat.
export function Sparkline({ data, width = 72, height = 20, color }: SparklineProps) {
  if (!data.length || data.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--text-faint)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }
  const first = data[0];
  const last = data[data.length - 1];
  const computed = color
    ? color
    : last > first
    ? "var(--up)"
    : last < first
    ? "var(--down)"
    : "var(--text-faint)";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const xScale = scaleLinear({ domain: [0, data.length - 1], range: [1, width - 1] });
  const yScale = scaleLinear({
    domain: [min === max ? min - 1 : min, min === max ? max + 1 : max],
    range: [height - 1, 1],
  });

  return (
    <svg width={width} height={height} aria-hidden>
      <LinePath
        data={data.map((v, i) => ({ i, v }))}
        x={(d) => xScale(d.i)}
        y={(d) => yScale(d.v)}
        stroke={computed}
        strokeWidth={1.25}
        curve={curveMonotoneX}
      />
    </svg>
  );
}
