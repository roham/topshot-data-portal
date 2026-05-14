import { biggestSalesAllTime } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { TopSales } from "@/components/TopSales";
import { formatUsd } from "@/lib/utils";

export const revalidate = 3600;

export default async function ArchivePage() {
  const top = await biggestSalesAllTime(25);
  const sumTop = top.reduce((s, t) => s + Number(t.price ?? 0), 0);
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="text-[var(--text-dim)] text-sm">
          A1 · All-time biggest sales ever recorded by the public marketplace. PRICE_DESC sort on searchMarketplaceTransactions · cache 60min.
        </p>
        <div className="grid grid-cols-3 gap-px bg-[var(--border)] rounded overflow-hidden mt-3 text-[12px]">
          <Cell label="Sales surfaced" value={top.length.toString()} />
          <Cell label="Top sale" value={formatUsd(Number(top[0]?.price ?? 0))} />
          <Cell label="Top-25 combined" value={formatUsd(sumTop)} />
        </div>
      </header>
      <Card title="Biggest sales ever" subtitle="Ranked by sale price · all time">
        <TopSales txns={top} limit={25} />
      </Card>
      <p className="text-[10px] text-[var(--text-faint)] mt-4 px-1">
        Public API caveat: sale records prior to ~2020 may not exist in this index; "all time" means the maximum the index returns when sorted by price.
      </p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-lg font-semibold tnum mt-0.5 truncate">{value}</div>
    </div>
  );
}
