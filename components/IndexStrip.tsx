import { Card } from "./primitives/Card";
import { KPI } from "./primitives/KPI";

interface IndexCell {
  slug: string;
  label: string;
  value: number | null;
  delta24h: number | null;
}

interface IndexStripProps {
  cells: IndexCell[];
}

// Homepage top strip — 5 cells, dense KPI band. Mirrors Hyperliquid's
// market-state strip and Card Ladder's index header.
export function IndexStrip({ cells }: IndexStripProps) {
  return (
    <Card variant="inset" className="overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y divide-[var(--border-subtle)] lg:divide-y-0 lg:divide-x">
        {cells.map((c) => (
          <a key={c.slug} href={`/indices/${c.slug}`} className="block p-3 hover:bg-[var(--surface-2)] transition-colors">
            <KPI
              label={c.label}
              value={c.value}
              format="usdCompact"
              size="md"
              delta={c.delta24h}
              deltaFormat="deltaPct"
            />
          </a>
        ))}
      </div>
    </Card>
  );
}
