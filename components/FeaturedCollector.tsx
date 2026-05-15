import Link from "next/link";
import { Card } from "./primitives/Card";
import { Num } from "./primitives/Num";

export interface FeaturedCollectorData {
  username: string;
  flowAddress: string | null;
  totalSpendWindowUsd: number;
  buyCountWindow: number;
  largestSaleUsd: number;
  largestSaleHref: string | null;
  hint: string; // crossed-into-X-tier, biggest-buy-of-the-night, etc.
}

interface Props {
  data: FeaturedCollectorData | null;
}

export function FeaturedCollector({ data }: Props) {
  if (!data) {
    return (
      <Card title="Featured collector" methodology="Selected by highest 24h buy-side spend in the recent transactions feed.">
        <div className="px-1 py-2 text-[11px] text-[var(--text-faint)] font-mono">
          No standout collector in the current window. Accumulator warming.
        </div>
      </Card>
    );
  }
  return (
    <Card
      title="Featured collector"
      methodology="Selected by highest 24h buy-side spend in the recent transactions feed. Identity from public profile fields; spend reconstructed client-side."
      variant="inset"
    >
      <Link
        href={`/u/${encodeURIComponent(data.username)}`}
        className="block p-3 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[16px] font-semibold text-[var(--text)]">{data.username}</span>
          <span className="text-[10px] tracking-data-label text-[var(--accent)]">{data.hint}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3">
          <Stat label="Spend (window)" value={data.totalSpendWindowUsd} format="usdCompact" />
          <Stat label="Buys" value={data.buyCountWindow} format="int" />
          <Stat label="Largest buy" value={data.largestSaleUsd} format="usdCompact" />
        </div>
      </Link>
    </Card>
  );
}

function Stat({ label, value, format }: { label: string; value: number; format: "usdCompact" | "int" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">{label}</span>
      <span className="text-[18px] font-semibold mt-0.5">
        <Num value={value} format={format} />
      </span>
    </div>
  );
}
