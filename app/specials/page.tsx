import Link from "next/link";
import { recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";
import { MomentMedia } from "@/components/MomentMedia";
import { formatUsd } from "@/lib/utils";

export const revalidate = 120;

export default async function SpecialsPage() {
  const txns = await recentSalesBulk(300);
  const jerseyMatches = txns.filter((t) => {
    const j = t.moment?.play?.stats?.jerseyNumber;
    const s = t.moment?.flowSerialNumber;
    if (!j || !s) return false;
    return Number(j) === Number(s) && Number(j) > 0;
  });
  const serial1 = txns.filter((t) => Number(t.moment?.flowSerialNumber) === 1);
  const lastSerial = txns.filter((t) => {
    const s = Number(t.moment?.flowSerialNumber);
    const c = t.moment?.edition?.circulationCount;
    return c && s === c;
  });
  const lowSerial = txns.filter((t) => {
    const s = Number(t.moment?.flowSerialNumber);
    return s > 1 && s <= 10;
  });

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Specials</h1>
        <p className="text-[var(--text-dim)] text-sm">
          Trophy-tier sales filtered from the {txns.length}-sale window — jersey matches, #1 serials,
          top-10 serials, and last-serial mints.
        </p>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Jersey matches" subtitle={`${jerseyMatches.length} in window`}>
          <Strip items={jerseyMatches} />
        </Card>
        <Card title="Serial #1" subtitle={`${serial1.length} in window`}>
          <Strip items={serial1} />
        </Card>
        <Card title="Top-10 serials" subtitle={`${lowSerial.length} in window`}>
          <Strip items={lowSerial} />
        </Card>
        <Card title="Last serials" subtitle={`${lastSerial.length} in window`}>
          <Strip items={lastSerial} />
        </Card>
      </div>
    </div>
  );
}

function Strip({ items }: { items: Array<{ id: string; price: string; moment?: { flowId?: string; flowSerialNumber?: string; tier?: string; play?: { stats?: { playerName?: string; jerseyNumber?: string } }; edition?: { circulationCount?: number } } }> }) {
  if (!items.length) return <div className="text-sm text-[var(--text-faint)] p-3">None.</div>;
  return (
    <div className="divide-y divide-[var(--border)]">
      {items.slice(0, 10).map((t) => {
        const m = t.moment;
        const serial = Number(m?.flowSerialNumber ?? 0);
        return (
          <Link href={m?.flowId ? `/moment/${m.flowId}` : "#"} key={t.id} className="px-3 py-2 flex items-center gap-3 hover:bg-[var(--bg-elev)]">
            {m?.flowId ? <MomentMedia flowId={m.flowId} type="hero" width={48} className="w-10 h-10 rounded object-cover bg-[var(--bg-elev)]" /> : <div className="w-10 h-10 rounded bg-[var(--bg-elev)]" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m?.play?.stats?.playerName ?? "—"}</div>
              <div className="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
                <TierPill tier={m?.tier} />
                <span className="tnum">#{serial}/{m?.edition?.circulationCount ?? "?"}</span>
                {m?.play?.stats?.jerseyNumber && Number(m.play.stats.jerseyNumber) === serial && (
                  <span className="text-[var(--accent)]">JERSEY</span>
                )}
              </div>
            </div>
            <div className="tnum text-sm text-[var(--accent)] font-semibold">{formatUsd(Number(t.price))}</div>
          </Link>
        );
      })}
    </div>
  );
}
