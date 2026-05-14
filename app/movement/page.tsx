import { recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { VolumeSpikes } from "@/components/VolumeSpikes";
import { TopSales } from "@/components/TopSales";
import { ActivityFeed } from "@/components/ActivityFeed";
import { formatUsd, formatNumber } from "@/lib/utils";

export const revalidate = 60;

export default async function MovementPage() {
  const txns = await recentSalesBulk(200);
  const totalVol = txns.reduce((s, t) => s + Number(t.price ?? 0), 0);
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Movement</h1>
        <p className="text-[var(--text-dim)] text-sm">
          M1 / M3 · Sliding window of {txns.length} most recent sales · cache 60s · ranked by volume + count
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border)] rounded overflow-hidden mt-3 text-[12px]">
          <Cell label="Window vol" value={formatUsd(totalVol)} />
          <Cell label="Sale count" value={formatNumber(txns.length)} />
          <Cell label="Median sale" value={formatUsd(median(txns.map((t) => Number(t.price ?? 0))))} />
          <Cell label="Top single" value={formatUsd(Math.max(...txns.map((t) => Number(t.price ?? 0))))} />
        </div>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Volume spikes" subtitle="M3 · top 10 players by volume in window">
          <VolumeSpikes txns={txns} />
        </Card>
        <Card title="Top sales by price" subtitle="M1 · biggest single sales in window">
          <TopSales txns={txns} limit={10} />
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Full window feed" subtitle="S5 · all recent sales">
          <div className="max-h-[640px] overflow-y-auto">
            <ActivityFeed txns={txns} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function median(arr: number[]): number {
  const a = arr.filter((x) => isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return 0;
  return a[Math.floor(a.length / 2)];
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-lg font-semibold tnum mt-0.5 truncate">{value}</div>
    </div>
  );
}
