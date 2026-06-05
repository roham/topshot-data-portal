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

// A sub-edition (parallel) is anything that isn't the base subedition "0".
const isParallel = (r: StoryRow) => r.subedition_id != null && r.subedition_id !== "0";

// A graph only earns its place with ≥3 real sale points; otherwise it's a
// 2-point diagonal that says nothing — so 2-sale stories go full card format
// (image-forward, auction-lot style à la Goldin / Panini / Topps).
const hasPath = (path: SalePoint[]) => path.filter((p) => p.price > 0).length >= 3;

// Big moment image with overlay badges + name plate — the "card front".
function StoryImage({ r, children }: { r: StoryRow; children?: React.ReactNode }) {
  const badge = r.is_one ? "#1" : r.is_jersey ? "JERSEY" : r.is_low ? `#${r.serial_number}` : null;
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-2)]">
      {r.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.image_url} alt={r.player_name ?? ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)]" />
      )}
      {/* top badges */}
      <div className="absolute left-2 top-2 flex items-center gap-1">
        {badge && <span className="rounded bg-[color-mix(in_srgb,var(--tier-legendary)_88%,black)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-black shadow">{badge}</span>}
        {isParallel(r) && <span className="rounded bg-black/55 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] backdrop-blur">parallel</span>}
      </div>
      <span className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[15px] font-bold tabular-nums shadow" style={{ color: "#052e1a", background: UP }}>{fmtMult(r.mult)}</span>
      {/* bottom name plate */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-8">
        <div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-semibold text-white">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
        <div className="truncate font-mono text-[9.5px] text-white/70">#{r.serial_number ?? "—"} · /{(r.subed_mint ?? r.edition_mint)?.toLocaleString() ?? "—"} · {r.series_name ?? ""}</div>
      </div>
      {children}
    </div>
  );
}

// Realized-price plate — auction-house "SOLD" treatment.
function SoldPlate({ r }: { r: StoryRow }) {
  return (
    <div className="flex items-end justify-between gap-2 px-3 py-2.5">
      <div className="min-w-0">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[var(--text-faint)]">last sold · {ago(r.last_at)}</div>
        <div className="text-[20px] font-bold leading-tight tabular-nums text-[var(--text)]"><Num value={r.last_sale} format="usd" /></div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">acquired</div>
        <div className="font-mono text-[12px] tabular-nums text-[var(--text-dim)]"><Num value={r.first_sale} format="usd" /></div>
      </div>
    </div>
  );
}

export function AppreciationStoryCard({ r, rank, path = [] }: { r: StoryRow; rank?: number; path?: SalePoint[] }) {
  return (
    <Link href={`/edition/${encodeURIComponent(r.edition_id)}`} className="group block overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-colors hover:border-[var(--border-strong)]">
      <StoryImage r={r}>
        {rank != null && <span className="absolute right-2 bottom-2 font-mono text-[10px] tabular-nums text-white/60">#{rank}</span>}
      </StoryImage>
      <SoldPlate r={r} />
      {/* graph only when ≥3 sales make a real path */}
      {hasPath(path) && (
        <div className="border-t border-[var(--border-subtle)] px-1 pt-1">
          <StoryClimbSpark path={path} id={r.moment_id} color={UP} height={40} />
        </div>
      )}
    </Link>
  );
}

// Hero — the single best story as a featured auction lot: large card image,
// big SOLD price, and (only if it has a real path) the climb.
export function StoryHero({ r, path = [] }: { r: StoryRow; path?: SalePoint[] }) {
  const scarcity = r.subed_mint ?? r.edition_mint;
  const badge = r.is_one ? "#1 of /" + (scarcity?.toLocaleString() ?? "—") : r.is_jersey ? "JERSEY MATCH" : r.is_low ? `LOW SERIAL #${r.serial_number}` : null;
  const showPath = hasPath(path);
  return (
    <Link
      href={`/edition/${encodeURIComponent(r.edition_id)}`}
      className="group mb-4 grid grid-cols-1 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--surface-1)] to-[color-mix(in_srgb,#34d399_5%,var(--surface-1))] transition-colors hover:border-[var(--border-strong)] sm:grid-cols-[minmax(0,260px)_1fr]"
    >
      {/* card front */}
      <div className="relative aspect-[4/5] sm:aspect-auto sm:min-h-[300px] overflow-hidden bg-[var(--surface-2)]">
        {r.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image_url} alt={r.player_name ?? ""} className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)]" />}
        <span className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-[20px] font-bold tabular-nums shadow" style={{ color: "#052e1a", background: UP }}>{fmtMult(r.mult)}</span>
      </div>
      {/* lot details */}
      <div className="flex flex-col justify-between gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-faint)]">Top story</span>
            {badge && <span className="rounded bg-[color-mix(in_srgb,var(--tier-legendary)_18%,transparent)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>{badge}</span>}
            {isParallel(r) && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">parallel</span>}
          </div>
          <div className="mt-2 flex items-center gap-2"><span className="truncate text-[22px] font-semibold leading-tight">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">#{r.serial_number ?? "—"} · /{scarcity?.toLocaleString() ?? "—"} · {r.n} sales · {ago(r.last_at)}</div>
        </div>
        {showPath && <StoryClimbSpark path={path} id={`hero-${r.moment_id}`} color={UP} height={96} />}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-faint)]">acquired → last sold</div>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              <span className="text-[15px] text-[var(--text-dim)]"><Num value={r.first_sale} format="usd" /></span>
              <span className="text-[var(--text-faint)]">→</span>
              <span className="text-[30px] font-bold tabular-nums text-[var(--text)]"><Num value={r.last_sale} format="usd" /></span>
            </div>
          </div>
          {r.hi != null && r.last_sale != null && r.hi > r.last_sale && (
            <span className="font-mono text-[10px] text-[var(--text-faint)]">peak <Num value={r.hi} format="usd" /></span>
          )}
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
