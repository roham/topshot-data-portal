// Cards for the three event-driven appreciation lanes. Server components — static,
// no chart. Each links to the edition's price page. Money via <Num>.

import Link from "next/link";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
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

// A sub-edition (parallel) is anything that isn't the base subedition "0".
const isParallel = (r: StoryRow) => r.subedition_id != null && r.subedition_id !== "0";

// Every story reads as a shareable social image: the moment is the backdrop,
// the price journey ($X → $Y, multiple) is stamped across it. SAME treatment on
// the hero and the grid — the hero is just larger. No free-standing-card look.
const fmtUsdShort = (v: number | null): string => {
  if (v == null) return "—";
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(v)}`;
};

// Top-corner badges: special-serial pill (left) + multiple pill (right).
function StoryBadges({ r, big }: { r: StoryRow; big?: boolean }) {
  const badge = r.is_one ? "#1" : r.is_jersey ? "JERSEY" : r.is_low ? `#${r.serial_number}` : null;
  return (
    <>
      <div className={`absolute ${big ? "left-3 top-3" : "left-2.5 top-2.5"} flex items-center gap-1`}>
        {badge && <span className="rounded bg-[var(--tier-legendary)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-black shadow">{badge}</span>}
        {isParallel(r) && <span className="rounded bg-black/55 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] backdrop-blur">parallel</span>}
      </div>
      <span className={`absolute ${big ? "right-3 top-3 text-[22px]" : "right-2.5 top-2.5 text-[15px]"} rounded-md px-1.5 py-0.5 font-bold tabular-nums shadow`} style={{ color: "#052e1a", background: UP }}>{fmtMult(r.mult)}</span>
    </>
  );
}

// The universal appreciation line — bought $X → now $Y. The star of every card.
function PriceJourney({ r, big }: { r: StoryRow; big?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 font-mono">
      <span className={`tabular-nums text-white/55 ${big ? "text-[18px]" : "text-[13px]"}`}>{fmtUsdShort(r.first_sale)}</span>
      <span className={`text-white/45 ${big ? "text-[18px]" : "text-[13px]"}`}>→</span>
      <span className={`font-bold tabular-nums text-white ${big ? "text-[40px] leading-none" : "text-[24px] leading-none"}`}>{fmtUsdShort(r.last_sale)}</span>
    </div>
  );
}

function StoryImg({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]" />
  ) : (
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)]" />
  );
}

// The named provenance — the real person who holds the moment now (= who bought
// it at the last-sale price). @username deep-links to their bag; this is what
// makes the story a social moment rather than abstract numbers. Falls back to
// the on-chain address (still real, just not custodial) when no username.
function OwnerLine({ r, big }: { r: StoryRow; big?: boolean }) {
  const size = big ? "text-[12px]" : "text-[10px]";
  if (r.owner_username) {
    return (
      <div className={`pointer-events-none mt-1.5 flex items-center gap-1 font-mono ${size}`}>
        <span className="text-white/45">held by</span>
        <Link
          href={`/u/${encodeURIComponent(r.owner_username)}`}
          className="pointer-events-auto relative z-20 font-semibold text-[var(--accent)] hover:underline"
        >
          @{r.owner_username}
        </Link>
      </div>
    );
  }
  if (r.owner_flow_address) {
    return (
      <div className={`pointer-events-none mt-1.5 font-mono text-white/40 ${size}`}>
        held by {r.owner_flow_address.slice(0, 6)}…{r.owner_flow_address.slice(-4)}
      </div>
    );
  }
  return null;
}

export function AppreciationStoryCard({ r, rank }: { r: StoryRow; rank?: number; path?: SalePoint[] }) {
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-2)]">
      <StoryImg src={r.image_url} alt={r.player_name ?? ""} />
      {/* full-card click → the moment's edition (sits behind the overlay) */}
      <Link href={`/edition/${encodeURIComponent(r.edition_id)}`} aria-label={`${r.player_name ?? "moment"} price history`} className="absolute inset-0 z-10" />
      <div className="pointer-events-none"><StoryBadges r={r} /></div>
      {rank != null && <span className="pointer-events-none absolute right-2.5 top-2.5 mt-7 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-white/70 backdrop-blur">#{rank}</span>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-3 pt-16">
        <div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-semibold text-white">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
        <div className="mt-1"><PriceJourney r={r} /></div>
        <OwnerLine r={r} />
        <div className="mt-1 truncate font-mono text-[9px] text-white/45">#{r.serial_number ?? "—"} · /{(r.subed_mint ?? r.edition_mint)?.toLocaleString() ?? "—"} · {r.n} sales · {ago(r.last_at)}</div>
      </div>
    </div>
  );
}

// Hero — the same social image, featured: full-width, larger, price journey
// huge. Identical message to the grid cards, just bigger.
export function StoryHero({ r }: { r: StoryRow; path?: SalePoint[] }) {
  const scarcity = r.subed_mint ?? r.edition_mint;
  return (
    <div className="group relative mb-4 aspect-[4/5] overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-2)] sm:aspect-[16/7]">
      <StoryImg src={r.image_url} alt={r.player_name ?? ""} />
      <Link href={`/edition/${encodeURIComponent(r.edition_id)}`} aria-label={`${r.player_name ?? "moment"} price history`} className="absolute inset-0 z-10" />
      <div className="pointer-events-none"><StoryBadges r={r} big /></div>
      <span className="pointer-events-none absolute left-3 top-3 mt-7 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-white/70 sm:block">Top story</span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-5 pb-5 pt-24">
        <div className="flex items-center gap-2"><span className="truncate text-[24px] font-semibold text-white">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
        <div className="mt-2"><PriceJourney r={r} big /></div>
        <OwnerLine r={r} big />
        <div className="mt-1.5 truncate font-mono text-[10px] text-white/55">#{r.serial_number ?? "—"} · /{scarcity?.toLocaleString() ?? "—"} · {r.n} sales · {ago(r.last_at)}</div>
      </div>
    </div>
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
