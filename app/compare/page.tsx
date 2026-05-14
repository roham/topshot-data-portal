import Link from "next/link";
import { Card } from "@/components/Card";
import { CollectorSearch } from "@/components/CollectorSearch";
import { getUserByFlow, getUserByUsername, fetchBagPage } from "@/lib/topshot/queries";
import type { MintedMoment, UserPublicInfo } from "@/lib/topshot/types";
import { formatNumber, formatUsd } from "@/lib/utils";

export const revalidate = 120;

async function resolve(idOrAddr: string): Promise<{ profile: UserPublicInfo | null; flowAddress: string | null }> {
  const addr = idOrAddr.startsWith("0x") ? idOrAddr.slice(2) : idOrAddr;
  if (/^[0-9a-fA-F]{16}$/.test(addr)) {
    return { profile: await getUserByFlow(addr), flowAddress: addr };
  }
  const profile = await getUserByUsername(idOrAddr);
  return { profile, flowAddress: profile?.flowAddress ?? null };
}

async function pullVisible(flowAddress: string, cap: number = 200): Promise<{ items: MintedMoment[]; total: number | null }> {
  const pages: MintedMoment[] = [];
  let cursor = "";
  let total: number | null = null;
  for (let i = 0; i < Math.ceil(cap / 100); i++) {
    const page = await fetchBagPage(flowAddress, cursor, 100);
    if (total == null) total = page.totalCount;
    pages.push(...page.items);
    cursor = page.rightCursor ?? "";
    if (!cursor || pages.length >= cap) break;
  }
  return { items: pages.slice(0, cap), total };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  if (!a || !b) {
    return (
      <div className="max-w-portal mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Compare</h1>
        <p className="text-[var(--text-dim)] text-sm mb-4">
          PC5 · Append <code className="font-mono text-[var(--accent)]">?a=USER&amp;b=USER</code> to compare two bags. Example:{" "}
          <Link href="/compare?a=BostonBased&b=BigDaddaBear" className="underline text-[var(--accent)]">
            BostonBased vs BigDaddaBear
          </Link>
          .
        </p>
        <div className="text-sm text-[var(--text-faint)]">Quick pick a collector to start, then add a second via URL.</div>
        <div className="mt-3"><CollectorSearch /></div>
      </div>
    );
  }
  const [resA, resB] = await Promise.all([resolve(a), resolve(b)]);
  if (!resA.flowAddress || !resB.flowAddress) {
    return (
      <div className="max-w-portal mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold">Couldn't resolve both names.</h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">
          a = {a} → {resA.flowAddress ?? "not found"} · b = {b} → {resB.flowAddress ?? "not found"}
        </p>
      </div>
    );
  }
  const [bagA, bagB] = await Promise.all([pullVisible(resA.flowAddress), pullVisible(resB.flowAddress)]);

  const setA = new Set(bagA.items.map((m) => m.edition?.id).filter(Boolean) as string[]);
  const setB = new Set(bagB.items.map((m) => m.edition?.id).filter(Boolean) as string[]);
  const sharedEditions = [...setA].filter((e) => setB.has(e));
  const onlyA = [...setA].filter((e) => !setB.has(e));
  const onlyB = [...setB].filter((e) => !setA.has(e));

  // Per-player overlap math
  const playersA = new Map<string, number>();
  const playersB = new Map<string, number>();
  for (const m of bagA.items) {
    const p = m.play?.stats?.playerName;
    if (p) playersA.set(p, (playersA.get(p) ?? 0) + 1);
  }
  for (const m of bagB.items) {
    const p = m.play?.stats?.playerName;
    if (p) playersB.set(p, (playersB.get(p) ?? 0) + 1);
  }
  const sharedPlayers = [...playersA.keys()].filter((p) => playersB.has(p));
  const sharedSorted = sharedPlayers
    .map((p) => ({ player: p, a: playersA.get(p) ?? 0, b: playersB.get(p) ?? 0 }))
    .sort((x, y) => y.a + y.b - (x.a + x.b))
    .slice(0, 12);

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-6 pb-4 border-b border-[var(--border)]">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">PC5 · Compare</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link href={`/u/${encodeURIComponent(resA.profile?.username ?? a)}`} className="hover:text-[var(--accent)]">
            {resA.profile?.username ?? a}
          </Link>
          <span className="text-[var(--text-faint)] mx-2">×</span>
          <Link href={`/u/${encodeURIComponent(resB.profile?.username ?? b)}`} className="hover:text-[var(--accent)]">
            {resB.profile?.username ?? b}
          </Link>
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-1">
          Each bag capped at 200 visible moments. Overlap math is exact on visible serials, conservative on full bags &gt; 200.
        </p>
      </header>

      <div className="grid sm:grid-cols-4 gap-px bg-[var(--border)] rounded overflow-hidden mb-6 text-[12px]">
        <Cell label={`${resA.profile?.username ?? a} bag`} value={`${formatNumber(bagA.total ?? 0)} / ${formatNumber(bagA.items.length)}`} />
        <Cell label={`${resB.profile?.username ?? b} bag`} value={`${formatNumber(bagB.total ?? 0)} / ${formatNumber(bagB.items.length)}`} />
        <Cell label="Shared editions" value={formatNumber(sharedEditions.length)} />
        <Cell label="Shared players" value={formatNumber(sharedPlayers.length)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Shared-player overlap" subtitle="Top 12 players both bags touch">
          <div className="divide-y divide-[var(--border)]">
            {sharedSorted.map((r) => {
              const max = Math.max(r.a, r.b, 1);
              return (
                <div key={r.player} className="px-4 py-2">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="flex-1 truncate">{r.player}</span>
                    <span className="tnum text-xs text-[var(--text-dim)] w-10 text-right">{r.a}</span>
                    <span className="tnum text-xs text-[var(--text-dim)] w-10 text-right">{r.b}</span>
                  </div>
                  <div className="flex gap-1 mt-1 h-1">
                    <div className="bg-[var(--accent)] rounded" style={{ width: `${(r.a / max) * 50}%` }} />
                    <div className="bg-[var(--rare)] rounded" style={{ width: `${(r.b / max) * 50}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Set distinctness" subtitle="Edition-ID exclusivity in visible bags">
          <div className="px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="tnum text-2xl font-semibold text-[var(--accent)]">{formatNumber(onlyA.length)}</span>
              <span className="text-[var(--text-dim)]">editions ONLY in {resA.profile?.username ?? a}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tnum text-2xl font-semibold text-[var(--rare)]">{formatNumber(onlyB.length)}</span>
              <span className="text-[var(--text-dim)]">editions ONLY in {resB.profile?.username ?? b}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tnum text-2xl font-semibold text-[var(--up)]">{formatNumber(sharedEditions.length)}</span>
              <span className="text-[var(--text-dim)]">editions SHARED across both</span>
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-3">
              Edition-ID overlap counts the same edition (play × parallel × tier) appearing in both bags, regardless of serial. Two collectors holding different serials of the same edition both contribute to "shared".
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-base sm:text-lg font-semibold tnum mt-0.5 truncate">{value}</div>
    </div>
  );
}
