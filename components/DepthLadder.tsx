"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

// V2 iter-3 — sell-side depth ladder for an edition.
//
// Each ListedSerial is a single ask at a single price. Public API exposes
// asks-only (Ceiling 10 confirmed STAGE-1), no per-listing size > 1, so
// "depth" here is count-of-listings-at-price.
//
// Visual layout:
//   - x-axis = ask price (linear, ascending)
//   - bars at each price = how many listings sit at exactly that price
//   - line overlay (right y-axis) = cumulative count: how many listings ≤ x
//   - yellow ReferenceArea bands where consecutive prices have a ratio > 1.20
//     (air gaps — trader can undercut the higher cluster by N% and still beat
//     the current floor)
//   - reference line at the current serial's price (highlight where I sit)

interface ListedSerial {
  flowId: string;
  serial: number;
  lowAsk: number;
  circulation: number;
}

interface DepthLadderProps {
  listed: ListedSerial[];
  currentSerial?: number;
  fairValue?: number | null;
  height?: number;
}

interface BucketRow {
  price: number;       // dollars, the price for this bucket
  count: number;       // listings at this bucket
  cumulative: number;  // cumulative count of listings at price ≤ this
  serials: number[];   // serials at this bucket (for tooltip)
}

interface AirGap {
  fromPrice: number;
  toPrice: number;
  ratio: number; // e.g. 1.42 means +42%
}

interface Wall {
  centerPrice: number;
  count: number;
}

const AIR_GAP_RATIO = 1.2; // > +20% consecutive jump = air gap
const WALL_COUNT = 3;       // ≥ 3 listings clustered = wall
const WALL_SPREAD = 0.05;   // within ±5% of each other

function buildLadder(listed: ListedSerial[]): {
  rows: BucketRow[];
  airGaps: AirGap[];
  walls: Wall[];
  median: number | null;
} {
  if (!listed.length) return { rows: [], airGaps: [], walls: [], median: null };
  const sorted = [...listed].sort((a, b) => a.lowAsk - b.lowAsk);
  // Bucket exact prices.
  const buckets = new Map<number, BucketRow>();
  for (const l of sorted) {
    const p = Math.round(l.lowAsk * 100) / 100;
    const cur = buckets.get(p);
    if (cur) {
      cur.count++;
      cur.serials.push(l.serial);
    } else {
      buckets.set(p, { price: p, count: 1, cumulative: 0, serials: [l.serial] });
    }
  }
  const rows = Array.from(buckets.values()).sort((a, b) => a.price - b.price);
  // Cumulative pass.
  let cum = 0;
  for (const r of rows) {
    cum += r.count;
    r.cumulative = cum;
  }
  // Air gap detection between consecutive bucket prices.
  const airGaps: AirGap[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].price;
    const b = rows[i].price;
    if (a > 0 && b / a > AIR_GAP_RATIO) {
      airGaps.push({ fromPrice: a, toPrice: b, ratio: b / a });
    }
  }
  // Wall detection: groups of >= WALL_COUNT bucket-rows whose prices fit in [center*(1-spread), center*(1+spread)].
  const walls: Wall[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    let countTotal = rows[i].count;
    while (j + 1 < rows.length && rows[j + 1].price / rows[i].price <= 1 + WALL_SPREAD * 2) {
      j++;
      countTotal += rows[j].count;
    }
    if (countTotal >= WALL_COUNT && j > i) {
      const centerPrice = (rows[i].price + rows[j].price) / 2;
      walls.push({ centerPrice, count: countTotal });
    }
    i = j + 1;
  }
  const median = sorted[Math.floor(sorted.length / 2)].lowAsk;
  return { rows, airGaps, walls, median };
}

function formatPrice(v: number): string {
  if (v >= 10000) return `$${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}K`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  if (v >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

interface TipPayload {
  active?: boolean;
  payload?: Array<{ payload?: BucketRow }>;
}

function LadderTooltip({ active, payload }: TipPayload) {
  if (!active || !payload?.[0]?.payload) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-strong)] rounded px-2.5 py-1.5 text-xs font-mono">
      <div className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider">price</div>
      <div className="text-[var(--text)] tabular-nums font-semibold">{formatPrice(r.price)}</div>
      <div className="mt-1 text-[10px] text-[var(--text-faint)]">
        {r.count} listed at this price · cum {r.cumulative}
      </div>
      {r.serials.length <= 6 && (
        <div className="mt-1 text-[10px] text-[var(--text-dim)]">serials #{r.serials.join(", #")}</div>
      )}
    </div>
  );
}

export function DepthLadder({ listed, currentSerial, fairValue, height = 220 }: DepthLadderProps) {
  const { rows, airGaps, walls, median } = useMemo(() => buildLadder(listed), [listed]);

  if (!rows.length) {
    return (
      <div className="text-sm text-[var(--text-faint)] px-4 py-3 font-mono">
        No listed serials returned for this edition — no depth visible.
      </div>
    );
  }

  // Current-serial-price marker (if the current moment is listed).
  const currentPrice = currentSerial
    ? listed.find((l) => l.serial === currentSerial)?.lowAsk
    : undefined;

  // Header strip cells.
  const cheapest = rows[0].price;
  const median2 = median ?? 0;
  const cheapestSerial = listed.slice().sort((a, b) => a.lowAsk - b.lowAsk)[0]?.serial;

  return (
    <div>
      <div className="grid sm:grid-cols-4 gap-px bg-[var(--border)] text-[12px] mb-3">
        <Cell label="Listed serials" value={`${listed.length}`} />
        <Cell label="Floor" value={formatPrice(cheapest)} sub={cheapestSerial ? `#${cheapestSerial}` : undefined} />
        <Cell label="Median ask" value={formatPrice(median2)} />
        <Cell
          label="Air gaps detected"
          value={`${airGaps.length}`}
          sub={airGaps.length > 0 ? `+${airGaps.map((g) => `${((g.ratio - 1) * 100).toFixed(0)}%`).join(", +")}` : "none ≥ +20%"}
        />
      </div>

      <div className="border border-[var(--border)] rounded p-3 bg-[var(--surface-1)]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] font-mono mb-2">
          Sell-side ladder · count-at-price + cumulative · asks-only (API ceiling: no bid data)
        </div>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 4, right: 36, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" />
              <XAxis
                dataKey="price"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatPrice}
                tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                stroke="var(--border-strong)"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                stroke="var(--border-strong)"
                width={28}
                allowDecimals={false}
                label={{ value: "count", angle: -90, position: "insideLeft", offset: 18, style: { fontSize: 9, fill: "var(--text-faint)" } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                stroke="var(--border-strong)"
                width={28}
                allowDecimals={false}
                label={{ value: "cum", angle: 90, position: "insideRight", offset: 18, style: { fontSize: 9, fill: "var(--text-faint)" } }}
              />
              <Tooltip content={<LadderTooltip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "2 3" }} />
              {airGaps.map((g) => (
                <ReferenceArea
                  key={`gap-${g.fromPrice}-${g.toPrice}`}
                  x1={g.fromPrice}
                  x2={g.toPrice}
                  strokeOpacity={0}
                  fill="var(--accent)"
                  fillOpacity={0.10}
                  yAxisId="left"
                  label={{
                    value: `air +${((g.ratio - 1) * 100).toFixed(0)}%`,
                    position: "insideTop",
                    style: { fontSize: 9, fill: "var(--accent)", fontFamily: "var(--font-mono)" },
                  }}
                />
              ))}
              {fairValue != null && fairValue > 0 && (
                <ReferenceLine
                  x={fairValue}
                  stroke="var(--accent)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.7}
                  yAxisId="left"
                  label={{
                    value: `fair ${formatPrice(fairValue)}`,
                    position: "top",
                    style: { fontSize: 9, fill: "var(--accent)", fontFamily: "var(--font-mono)" },
                  }}
                />
              )}
              {currentPrice != null && (
                <ReferenceLine
                  x={currentPrice}
                  stroke="var(--up)"
                  strokeWidth={1.5}
                  yAxisId="left"
                  label={{
                    value: `this #${currentSerial}`,
                    position: "insideBottomRight",
                    style: { fontSize: 9, fill: "var(--up)", fontFamily: "var(--font-mono)" },
                  }}
                />
              )}
              <Bar yAxisId="left" dataKey="count" fill="var(--down)" fillOpacity={0.55} />
              <Line
                yAxisId="right"
                type="stepAfter"
                dataKey="cumulative"
                stroke="var(--text-dim)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {walls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="text-[var(--text-faint)] uppercase tracking-wider">walls:</span>
            {walls.map((w) => (
              <span
                key={`wall-${w.centerPrice}`}
                className="text-[var(--down)] border border-[var(--border)] rounded px-1.5 py-0.5"
              >
                @ {formatPrice(w.centerPrice)} ({w.count} listings within ±5%)
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[var(--text-faint)] mt-2 leading-snug font-mono">
          Each red bar = listings at that exact ask. Grey step-line = cumulative count from cheapest up. Yellow band = air
          gap &gt; +20% between consecutive prices (undercut opportunity). Asks-only — Top Shot's public API exposes no bid data.
        </p>
      </div>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--surface-1)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-base font-semibold tnum mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-faint)] tnum truncate">{sub}</div>}
    </div>
  );
}
