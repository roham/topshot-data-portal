import Link from "next/link";
import { notFound } from "next/navigation";
import { getMoment } from "@/lib/topshot/queries";
import { ownerAddr } from "@/lib/topshot/types";
import { formatNumber, formatUsd, mediaUrl, shortAddr, tierLabel, timeAgo } from "@/lib/utils";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";
import { valueMoment, DEFAULT_RULES } from "@/lib/valuation";
import type { Adjustment } from "@/lib/valuation";

export const revalidate = 60;

export default async function MomentPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  const m = await getMoment(flowId);
  if (!m) notFound();

  const v = valueMoment(m, { recentSales: [] });
  const serial = Number(m.flowSerialNumber);
  const jersey = m.play?.stats?.jerseyNumber ? Number(m.play.stats.jerseyNumber) : null;
  const jerseyMatch = jersey && serial === jersey;
  const owner = m.ownerV2;

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        {/* Media */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(m.flowId, "hero", { width: 600 })}
            alt={m.play?.stats?.playerName ?? ""}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elev)]"
          />
          <div className="mt-2 text-[11px] text-[var(--text-faint)] font-mono">
            flowId {m.flowId}
            {" · "}
            <a href={`https://www.flowscan.io/account/0x${ownerAddr(owner) ?? ""}`} target="_blank" className="underline">flowscan</a>
          </div>
        </div>

        <div>
          {/* Title */}
          <div className="mb-4">
            <div className="text-[var(--text-faint)] text-xs uppercase tracking-wider">
              {m.set?.flowName ?? "—"} · Series {m.set?.flowSeriesNumber ?? "?"}{" "}
              {m.edition?.parallelID && m.edition.parallelID > 0 ? <span className="text-[var(--accent)]">· Parallel #{m.edition.parallelID}</span> : null}
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
              {m.play?.stats?.playerName ?? "—"}
              <span className="tnum text-[var(--text-faint)] font-normal ml-3 text-lg">
                #{m.flowSerialNumber}<span className="text-[var(--text-dim)]">/{m.edition?.circulationCount ?? "?"}</span>
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-dim)]">
              <TierPill tier={m.tier} />
              <span>{m.play?.stats?.playCategory ?? "—"} · {m.play?.stats?.teamAtMoment ?? "—"}</span>
              {m.play?.stats?.dateOfMoment && <span>· {new Date(m.play.stats.dateOfMoment).toLocaleDateString()}</span>}
            </div>
            {jerseyMatch && (
              <div className="mt-3 inline-block text-[var(--accent)] text-xs font-semibold border border-[var(--accent)] rounded px-2 py-1">
                JERSEY MATCH · serial = #{jersey}
              </div>
            )}
          </div>

          {/* Valuation block */}
          <Card title="Valuation" subtitle="V1 + V2 · rules engine output" className="mb-4">
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
              <div className="px-4 py-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Live floor (this serial)</div>
                <div className="text-2xl font-semibold tnum mt-1">
                  {m.forSale && m.lowAsk != null ? formatUsd(m.lowAsk) : <span className="text-[var(--text-faint)]">not listed</span>}
                </div>
                <div className="text-[11px] text-[var(--text-faint)] mt-1">MintedMoment.lowAsk · live</div>
              </div>
              <div className="px-4 py-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Fair value</div>
                <div className="text-2xl font-semibold tnum mt-1 text-[var(--accent)]">
                  {v.fairValue != null ? formatUsd(v.fairValue) : "—"}
                </div>
                <div className={`text-[11px] mt-1 conf-${v.confidence}`}>confidence: {v.confidence}</div>
              </div>
              <div className="px-4 py-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Last sale</div>
                <div className="text-2xl font-semibold tnum mt-1">
                  {m.lastPurchasePrice != null ? formatUsd(m.lastPurchasePrice) : "—"}
                </div>
                <div className="text-[11px] text-[var(--text-faint)] mt-1">
                  {m.acquiredAt ? `acquired ${timeAgo(m.acquiredAt)} ago` : "—"}
                </div>
              </div>
            </div>
            {/* Adjustments */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">
                Adjustments — rules applied
              </div>
              {v.adjustments.length === 0 ? (
                <div className="text-sm text-[var(--text-dim)]">No premium/discount rules matched. Base value passes through unchanged.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {v.adjustments.map((a: Adjustment) => (
                    <li key={a.rule} className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-[var(--accent)] w-32">{a.rule}</span>
                      <span className="tnum text-[var(--text-dim)] w-14">×{a.multiplier.toFixed(2)}</span>
                      <span className="text-[var(--text)]">{a.rationale}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-[10px] text-[var(--text-faint)] mt-2">
                Base from {v.base != null ? formatUsd(v.base) : "—"} → fair value {v.fairValue != null ? formatUsd(v.fairValue) : "—"}.
                <Link href="/rules" className="underline ml-2">edit rules</Link>
              </div>
            </div>
          </Card>

          {/* Owner */}
          <Card title="Current owner" className="mb-4">
            <div className="px-4 py-3 flex items-center gap-3">
              {owner?.__typename === "User" && owner.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={owner.profileImageUrl} alt={owner.username ?? ""} className="w-10 h-10 rounded-full ring-1 ring-[var(--border)]" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--bg-elev)] flex items-center justify-center text-[var(--text-faint)]">◇</div>
              )}
              <div className="flex-1 min-w-0">
                {owner?.__typename === "User" && owner.username ? (
                  <Link href={`/u/${encodeURIComponent(owner.username)}`} className="font-semibold hover:text-[var(--accent)]">
                    {owner.username}
                  </Link>
                ) : (
                  <span className="text-[var(--text-dim)]">self-custody</span>
                )}
                <div className="font-mono text-[11px] text-[var(--text-faint)]">{ownerAddr(owner) ?? "—"}</div>
              </div>
              <Link href={`/u/${encodeURIComponent(owner?.username ?? ownerAddr(owner) ?? "")}`} className="text-[var(--accent)] text-xs">
                see bag →
              </Link>
            </div>
          </Card>

          {/* Play description */}
          {m.play?.description && (
            <Card title="The play" className="mb-4">
              <p className="text-sm text-[var(--text-dim)] px-4 py-3 leading-relaxed">{m.play.description}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
