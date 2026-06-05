// Cards for the three event-driven appreciation lanes. Server components — static,
// no chart. Each links to the edition's price page. Money via <Num>.

import Link from "next/link";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { StoryClimbSpark } from "@/components/appreciation/StoryClimbSpark";
import type { StoryRow, FloorSmashRow, IlliquidRow, SalePoint } from "@/lib/supabase/queries/appreciation-events";

const UP = "#34d399";
const GOLD = "var(--tier-legendary)";
const fmtMult = (m: number | null) => (m == null ? "—" : m >= 10 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`);

function ago(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

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

function SerialBadge({ r }: { r: StoryRow }) {
  const label = r.is_one ? "#1" : r.is_jersey ? "JERSEY" : r.is_low ? `LOW #${r.serial_number}` : null;
  if (!label) return null;
  return <span className="rounded bg-[color-mix(in_srgb,var(--tier-legendary)_16%,transparent)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>{label}</span>;
}
// A sub-edition (parallel) is anything that isn't the base subedition "0".
const isParallel = (r: StoryRow) => r.subedition_id != null && r.subedition_id !== "0";

export function AppreciationStoryCard({ r, rank, path = [] }: { r: StoryRow; rank?: number; path?: SalePoint[] }) {
  const scarcity = r.subed_mint ?? r.edition_mint; // TRUE scarcity = the sub-edition's own mint
  return (
    <Shell href={`/edition/${encodeURIComponent(r.edition_id)}`}>
      <div className="flex items-start gap-3">
        {rank != null && <span className="mt-1 shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-faint)]">{rank}</span>}
        <Avatar src={r.image_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /><SerialBadge r={r} />
            {isParallel(r) && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">parallel</span>}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">#{r.serial_number ?? "—"} · /{scarcity?.toLocaleString() ?? "—"}{isParallel(r) ? " sub-edition" : ""} · {r.n} sales · {ago(r.last_at)}</div>
        </div>
        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[16px] font-bold tabular-nums" style={{ color: UP, background: "color-mix(in srgb, #34d399 12%, transparent)" }}>{fmtMult(r.mult)}</span>
      </div>
      {/* The climb — real cleared-sale path */}
      <div className="mt-3"><StoryClimbSpark path={path} id={r.moment_id} color={UP} height={56} /></div>
      <div className="mt-2 flex items-baseline gap-2 font-mono text-[12px]">
        <span className="text-[var(--text-dim)]"><Num value={r.first_sale} format="usd" /></span>
        <span className="text-[var(--text-faint)]">→</span>
        <span className="text-[17px] font-semibold tabular-nums text-[var(--text)]"><Num value={r.last_sale} format="usd" /></span>
        {r.hi != null && r.last_sale != null && r.hi > r.last_sale && (
          <span className="text-[9px] text-[var(--text-faint)]">peak <Num value={r.hi} format="usd" /></span>
        )}
        {r.edition_floor != null && <span className="ml-auto text-[10px] text-[var(--text-faint)]">floor <Num value={r.edition_floor} format="usd" /></span>}
      </div>
    </Shell>
  );
}

// Hero — the single best story, rendered large with a wide climb chart.
export function StoryHero({ r, path = [] }: { r: StoryRow; path?: SalePoint[] }) {
  const scarcity = r.subed_mint ?? r.edition_mint;
  const badge = r.is_one ? "#1" : r.is_jersey ? "JERSEY MATCH" : r.is_low ? `LOW SERIAL #${r.serial_number}` : null;
  return (
    <Link
      href={`/edition/${encodeURIComponent(r.edition_id)}`}
      className="group mb-4 block overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--surface-1)] to-[color-mix(in_srgb,#34d399_5%,var(--surface-1))] transition-colors hover:border-[var(--border-strong)]"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
        {/* Left: identity + numbers */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-faint)]">Top story</span>
            {badge && <span className="rounded bg-[color-mix(in_srgb,var(--tier-legendary)_18%,transparent)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>{badge}</span>}
            {isParallel(r) && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">parallel</span>}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Avatar src={r.image_url} />
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="truncate text-[20px] font-semibold leading-tight">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">#{r.serial_number ?? "—"} · /{scarcity?.toLocaleString() ?? "—"} · {r.n} sales · {ago(r.last_at)}</div>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-faint)]">bought → sold</div>
              <div className="mt-1 flex items-baseline gap-2 font-mono">
                <span className="text-[15px] text-[var(--text-dim)]"><Num value={r.first_sale} format="usd" /></span>
                <span className="text-[var(--text-faint)]">→</span>
                <span className="text-[28px] font-bold tabular-nums text-[var(--text)]"><Num value={r.last_sale} format="usd" /></span>
              </div>
            </div>
            <span className="ml-auto rounded-lg px-2.5 py-1 text-[26px] font-bold tabular-nums" style={{ color: UP, background: "color-mix(in srgb, #34d399 14%, transparent)" }}>{fmtMult(r.mult)}</span>
          </div>
        </div>
        {/* Right: the big climb */}
        <div className="flex w-full flex-col justify-end sm:w-[52%]">
          <StoryClimbSpark path={path} id={`hero-${r.moment_id}`} color={UP} height={150} />
        </div>
      </div>
    </Link>
  );
}

const parallelsNote = (n: number | null) => (n != null && n > 1 ? ` · ${n} parallels` : "");

export function FloorSmashCard({ r }: { r: FloorSmashRow }) {
  return (
    <Shell href={`/edition/${encodeURIComponent(r.edition_id)}`}>
      <div className="flex items-start gap-3">
        <Avatar src={r.image_url} />
        <Identity player={r.player_name} tier={r.tier_name} sub={`${r.series_name ?? "—"} · /${r.mint_count?.toLocaleString() ?? "—"}${parallelsNote(r.n_sub)}`} />
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
        <Identity player={r.player_name} tier={r.tier_name} sub={`${r.series_name ?? "—"} · /${r.mint_count?.toLocaleString() ?? "—"}${parallelsNote(r.n_sub)}`} />
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
