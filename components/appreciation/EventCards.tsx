// Cards for the three event-driven appreciation lanes. Server components — static,
// no chart. Each links to the edition's price page. Money via <Num>.

import Link from "next/link";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import type { StoryRow, FloorSmashRow, IlliquidRow } from "@/lib/supabase/queries/appreciation-events";

const UP = "#34d399";
const GOLD = "var(--tier-legendary)";
const fmtMult = (m: number | null) => (m == null ? "—" : m >= 10 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`);

function Avatar({ src }: { src: string | null }) {
  return src
    ? // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border-subtle)]" />
    : <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--surface-2)]" />;
}

function Shell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]">
      {children}
    </Link>
  );
}

function Identity({ player, tier, sub }: { player: string | null; tier: string | null; sub: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold">{player ?? "—"}</span><TierChip tier={tier} /></div>
      <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">{sub}</div>
    </div>
  );
}

export function AppreciationStoryCard({ r }: { r: StoryRow }) {
  return (
    <Shell href={`/edition/${encodeURIComponent(r.edition_id)}`}>
      <div className="flex items-start gap-3">
        <Avatar src={r.image_url} />
        <Identity player={r.player_name} tier={r.tier_name} sub={`#${r.serial_number ?? "—"} · /${r.mint_count?.toLocaleString() ?? "—"} · ${r.n} sales`} />
        <span className="shrink-0 text-[16px] font-bold tabular-nums" style={{ color: UP }}>{fmtMult(r.mult)}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 font-mono text-[12px]">
        <span className="text-[var(--text-dim)]"><Num value={r.first_sale} format="usd" /></span>
        <span className="text-[var(--text-faint)]">→</span>
        <span className="text-[17px] font-semibold tabular-nums text-[var(--text)]"><Num value={r.last_sale} format="usd" /></span>
        {r.edition_floor != null && <span className="ml-auto text-[10px] text-[var(--text-faint)]">floor <Num value={r.edition_floor} format="usd" /></span>}
      </div>
    </Shell>
  );
}

export function FloorSmashCard({ r }: { r: FloorSmashRow }) {
  return (
    <Shell href={`/edition/${encodeURIComponent(r.edition_id)}`}>
      <div className="flex items-start gap-3">
        <Avatar src={r.image_url} />
        <Identity player={r.player_name} tier={r.tier_name} sub={`${r.series_name ?? "—"} · /${r.mint_count?.toLocaleString() ?? "—"}`} />
        <span className="shrink-0 rounded-md px-2 py-0.5 text-[15px] font-bold tabular-nums" style={{ color: GOLD, background: "color-mix(in srgb, var(--tier-legendary) 14%, transparent)" }}>↑{fmtMult(r.jump_mult)}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 font-mono text-[12px]">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-faint)]">floor smashed</span>
        <span className="ml-auto text-[var(--text-dim)]"><Num value={r.floor_before} format="usd" /></span>
        <span className="text-[var(--text-faint)]">→</span>
        <span className="text-[17px] font-semibold tabular-nums" style={{ color: GOLD }}><Num value={r.floor_now} format="usd" /></span>
      </div>
    </Shell>
  );
}

export function IlliquidCard({ r }: { r: IlliquidRow }) {
  return (
    <Shell href={`/edition/${encodeURIComponent(r.edition_id)}`}>
      <div className="flex items-start gap-3">
        <Avatar src={r.image_url} />
        <Identity player={r.player_name} tier={r.tier_name} sub={`${r.series_name ?? "—"} · /${r.mint_count?.toLocaleString() ?? "—"}`} />
        <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-dim)]">thinly traded</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 font-mono text-[11px] text-[var(--text-faint)]">
        <span>floor <span className="text-[15px] font-semibold tabular-nums text-[var(--text)]"><Num value={r.floor} format="usd" /></span></span>
        <span className="ml-auto">{r.sales_90d} sales · 90d · last <Num value={r.last_sale} format="usd" /></span>
      </div>
      {r.msrp_pack && <div className="mt-1 truncate font-mono text-[9.5px] text-[var(--text-faint)]">pulled from {r.msrp_pack}</div>}
    </Shell>
  );
}
