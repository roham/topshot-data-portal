"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MintedMoment } from "@/lib/topshot/types";
import { mediaUrl, tierLabel } from "@/lib/utils";
import { TierPill } from "./Tier";

const TIERS = ["COMMON", "FANDOM", "RARE", "LEGENDARY", "ULTIMATE"];

export function HoldingsGrid({ items }: { items: MintedMoment[] }) {
  const [tier, setTier] = useState<string>("ALL");
  const [team, setTeam] = useState<string>("ALL");
  const [sort, setSort] = useState<"recent" | "serial-asc" | "serial-desc" | "tier">("recent");

  const teams = useMemo(() => {
    const s = new Set<string>();
    for (const m of items) if (m.play?.stats?.teamAtMoment) s.add(m.play.stats.teamAtMoment);
    return [...s].sort();
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (tier !== "ALL") r = r.filter((m) => (m.tier ?? "").endsWith(tier));
    if (team !== "ALL") r = r.filter((m) => m.play?.stats?.teamAtMoment === team);
    if (sort === "serial-asc") r = [...r].sort((a, b) => Number(a.flowSerialNumber) - Number(b.flowSerialNumber));
    if (sort === "serial-desc") r = [...r].sort((a, b) => Number(b.flowSerialNumber) - Number(a.flowSerialNumber));
    if (sort === "tier") r = [...r].sort((a, b) => (a.tier ?? "").localeCompare(b.tier ?? ""));
    return r;
  }, [items, tier, team, sort]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-baseline px-3 py-2 border-b border-[var(--border)] text-xs">
        <span className="text-[var(--text-faint)] uppercase tracking-wider">Filter</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded px-2 py-1 text-xs">
          <option value="ALL">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>{tierLabel(`MOMENT_TIER_${t}`)}</option>
          ))}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded px-2 py-1 text-xs">
          <option value="ALL">All teams</option>
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="text-[var(--text-faint)] uppercase tracking-wider ml-2">Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-[var(--bg-elev)] border border-[var(--border)] rounded px-2 py-1 text-xs">
          <option value="recent">Recently acquired</option>
          <option value="serial-asc">Serial low → high</option>
          <option value="serial-desc">Serial high → low</option>
          <option value="tier">Tier</option>
        </select>
        <span className="ml-auto tnum text-[var(--text-faint)]">{filtered.length} / {items.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
        {filtered.map((m) => {
          const serial = Number(m.flowSerialNumber);
          const jersey = Number(m.play?.stats?.jerseyNumber);
          const jerseyMatch = jersey && serial === jersey;
          return (
            <Link
              key={m.flowId}
              href={`/moment/${m.flowId}`}
              className="block bg-[var(--bg-elev)] border border-[var(--border)] rounded overflow-hidden card-hover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m.flowId, "hero", { width: 240 })} alt={m.play?.stats?.playerName ?? ""} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-2">
                <div className="text-xs font-medium truncate">{m.play?.stats?.playerName ?? "—"}</div>
                <div className="text-[10px] text-[var(--text-faint)] truncate flex items-center justify-between mt-0.5">
                  <span className={jerseyMatch ? "text-[var(--accent)]" : ""}>
                    #{serial}/{m.edition?.circulationCount ?? "?"}
                  </span>
                  <TierPill tier={m.tier} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
