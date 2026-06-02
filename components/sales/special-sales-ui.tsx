// Special-serial showcase UI for /sales. Server components, CSS-only motion.
//
// Each special-serial category carries its own visual identity so a collector
// reads the *why* at a glance: First Mint (#1) is gold, Jersey Match is electric
// cyan, Omega and Galactic get cosmic parallel washes, Low Serials are steel.
// Player imagery is the official NBA headshot (cdn.nba.com) over a team-color
// gradient — never synthesized art (constitution: real marks only).

import Link from "next/link";
import Image from "next/image";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { NBA_HEADSHOT, colorsForTeamId } from "@/lib/nba-team-colors";
import type { SpecialSaleRow } from "@/lib/supabase/queries/special-sales";

// ── Category theme ─────────────────────────────────────────────────────────
export type ThemeKey = "serial_one" | "jersey" | "omega" | "galactic" | "low_serial";

export interface Theme {
  id: string;
  kicker: string;
  title: string;
  glyph: string;
  blurb: string;
  /** Primary accent color for this category. */
  accent: string;
  /** Soft fill used behind imagery / chips. */
  fill: string;
  /** Whether to apply the animated cosmic wash (parallels). */
  cosmic?: boolean;
  /** Optional second color for cosmic gradient. */
  accent2?: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  serial_one: {
    id: "first-mint",
    kicker: "Serial #1",
    title: "First Mint",
    glyph: "①",
    blurb: "The genesis serial of the edition — the one every set-builder chases.",
    accent: "#F59E0B",
    fill: "rgba(245,158,11,0.12)",
  },
  jersey: {
    id: "jersey-match",
    kicker: "Serial = Jersey №",
    title: "Jersey Match",
    glyph: "≡",
    blurb: "Serial number lands on the player's jersey number — a one-in-the-edition coincidence collectors pay up for.",
    accent: "#38BDF8",
    fill: "rgba(56,189,248,0.12)",
  },
  omega: {
    id: "omega",
    kicker: "Parallel · /rarest",
    title: "Omega",
    glyph: "Ω",
    blurb: "The scarcest parallel in the set — typically the lowest mint count Top Shot issues.",
    accent: "#FCD34D",
    accent2: "#B45309",
    fill: "rgba(252,211,77,0.10)",
    cosmic: true,
  },
  galactic: {
    id: "galactic",
    kicker: "Parallel · cosmic",
    title: "Galactic",
    glyph: "✦",
    blurb: "A premium cosmic parallel — limited mint, distinct visual treatment, scarcity priced in.",
    accent: "#A78BFA",
    accent2: "#22D3EE",
    fill: "rgba(167,139,250,0.10)",
    cosmic: true,
  },
  low_serial: {
    id: "low-serials",
    kicker: "Serial #2–10",
    title: "Low Serials",
    glyph: "#",
    blurb: "Single-digit and top-ten serials — the next tier of mint-number scarcity after #1.",
    accent: "#94A3B8",
    fill: "rgba(148,163,184,0.10)",
  },
};

// tier_name arrives in label form (e.g. "Legendary"); TierChip wants the raw key.
const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};
function rawTier(name: string | null | undefined): string | null {
  return name ? (TIER_NAME_TO_RAW[name] ?? null) : null;
}

function soldDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function momentHref(sale: SpecialSaleRow): string | null {
  if (sale.moment_flow_id) return `/moment/${sale.moment_flow_id}`;
  if (sale.edition_id) return `/edition/${sale.edition_id}`;
  return null;
}

/** Clean a Top Shot edition_name into a short, human "set · play" line. */
function momentTitle(sale: SpecialSaleRow): string {
  if (sale.set_name) return sale.set_name;
  // edition_name like "Player - Team - PLAY - date - Set - 8"; take the set-ish segment.
  const parts = (sale.edition_name ?? "").split(" - ");
  return parts.length >= 5 ? parts[parts.length - 2] : (sale.edition_name ?? "—");
}

// The reason badge(s) that make this sale special, in priority order.
function reasonsFor(sale: SpecialSaleRow): Array<{ label: string; color: string; bg: string }> {
  const out: Array<{ label: string; color: string; bg: string }> = [];
  if (sale.is_serial_one) out.push({ label: "#1 FIRST MINT", color: THEMES.serial_one.accent, bg: THEMES.serial_one.fill });
  if (sale.is_omega) out.push({ label: "Ω OMEGA", color: THEMES.omega.accent, bg: THEMES.omega.fill });
  if (sale.is_galactic) out.push({ label: "✦ GALACTIC", color: THEMES.galactic.accent, bg: THEMES.galactic.fill });
  else if (sale.parallel_name && sale.parallel_name !== "Base" && !sale.is_omega)
    out.push({ label: sale.parallel_name.toUpperCase(), color: "#C4B5FD", bg: "rgba(196,181,253,0.10)" });
  if (sale.is_jersey_match) out.push({ label: `JERSEY · №${sale.jersey_number}`, color: THEMES.jersey.accent, bg: THEMES.jersey.fill });
  if (sale.is_last_serial) out.push({ label: "FINAL MINT", color: "#F472B6", bg: "rgba(244,114,182,0.10)" });
  if (sale.is_low_serial && out.length === 0) out.push({ label: `#${sale.serial_number} LOW`, color: THEMES.low_serial.accent, bg: THEMES.low_serial.fill });
  return out;
}

function serialLine(sale: SpecialSaleRow): string {
  const sn = sale.serial_number != null ? `#${sale.serial_number}` : "#—";
  return sale.circulation ? `${sn} / ${sale.circulation.toLocaleString("en-US")}` : sn;
}

// ── Headshot frame with team-color wash ──────────────────────────────────────
function Headshot({ sale, accent, size, priority }: { sale: SpecialSaleRow; accent: string; size: "hero" | "card"; priority?: boolean }) {
  const colors = sale.team_id ? colorsForTeamId(sale.team_id) : undefined;
  const c1 = colors?.primary ?? accent;
  const c2 = colors?.secondary ?? "#0B0B0E";
  const dim = size === "hero" ? "h-full" : "h-[150px]";
  return (
    <div
      className={`relative w-full ${dim} overflow-hidden`}
      style={{ background: `radial-gradient(120% 100% at 50% 18%, ${c1}33 0%, ${c2}22 42%, transparent 78%)` }}
    >
      {/* faint floor grid for terminal texture */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "linear-gradient(var(--border-strong) 1px, transparent 1px)", backgroundSize: "100% 22px" }}
      />
      {sale.player_id ? (
        <Image
          src={NBA_HEADSHOT(sale.player_id)}
          alt={sale.player_name ?? "player"}
          fill
          sizes={size === "hero" ? "420px" : "260px"}
          className="object-contain object-bottom drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
          unoptimized
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[var(--text-faint)] font-mono text-[11px]">
          no headshot
        </div>
      )}
    </div>
  );
}

// ── Standard showcase card ────────────────────────────────────────────────
export function SpecialSaleCard({
  sale,
  theme,
  index = 0,
}: {
  sale: SpecialSaleRow;
  theme: Theme;
  index?: number;
}) {
  const href = momentHref(sale);
  const reasons = reasonsFor(sale);
  const body = (
    <article
      className="reveal-rise group relative flex w-[248px] shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-all duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 45}ms`, ["--ring" as string]: theme.accent }}
    >
      <div
        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${theme.accent}66, 0 8px 30px -8px ${theme.accent}55` }}
      />
      <div className="relative">
        <Headshot sale={sale} accent={theme.accent} size="card" />
        {/* serial chip top-left */}
        <div
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums backdrop-blur-sm"
          style={{ color: theme.accent, background: "rgba(0,0,0,0.5)", border: `1px solid ${theme.accent}55` }}
        >
          {serialLine(sale)}
        </div>
        {/* tier chip top-right */}
        {sale.tier_name && (
          <div className="absolute right-2 top-2">
            <TierChip tier={rawTier(sale.tier_name)} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="font-mono text-[19px] font-semibold tabular-nums text-[var(--up)] leading-none">
          <Num value={sale.gross_amount_usd} format="usd" />
        </div>
        <div className="truncate text-[13px] font-medium text-[var(--text)]">{sale.player_name ?? "—"}</div>
        <div className="flex flex-wrap gap-1">
          {reasons.slice(0, 2).map((r) => (
            <span
              key={r.label}
              className="rounded px-1 py-0.5 font-mono text-[9px] tracking-data-label"
              style={{ color: r.color, background: r.bg, border: `1px solid ${r.color}40` }}
            >
              {r.label}
            </span>
          ))}
        </div>
        <div className="mt-auto truncate font-mono text-[10px] text-[var(--text-dim)]">{momentTitle(sale)}</div>
        <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-faint)]">
          <span className="truncate">{sale.buyer_safe_name ? `→ ${sale.buyer_safe_name}` : ""}</span>
          <span className="shrink-0">{soldDate(sale.completed_at)}</span>
        </div>
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

// ── Featured hero — the single greatest special sale in the window ──────────
export function FeaturedHero({ sale }: { sale: SpecialSaleRow }) {
  const href = momentHref(sale);
  const reasons = reasonsFor(sale);
  const colors = sale.team_id ? colorsForTeamId(sale.team_id) : undefined;
  const c1 = colors?.primary ?? "#F59E0B";
  const body = (
    <article className="reveal-rise group relative overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)]">
      {/* team-color radial wash */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(90% 130% at 82% 50%, ${c1}33 0%, ${c1}11 38%, transparent 70%)` }}
      />
      <div className="absolute inset-0 cosmic-drift opacity-40"
        style={{ background: `radial-gradient(60% 120% at 15% 0%, rgba(245,158,11,0.10), transparent 60%)` }} />
      <div className="relative grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_360px] md:p-6">
        <div className="flex flex-col justify-center">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-data-label text-[var(--accent)]">★ TOP SPECIAL SALE</span>
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span className="font-mono text-[10px] tabular-nums text-[var(--text-faint)]">{serialLine(sale)}</span>
          </div>
          <div className="font-mono text-[42px] font-bold leading-none tabular-nums text-[var(--up)] md:text-[56px]">
            <Num value={sale.gross_amount_usd} format="usd" precision={0} />
          </div>
          <div className="mt-3 text-[22px] font-semibold text-[var(--text)] md:text-[26px]">{sale.player_name ?? "—"}</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--text-dim)]">
            {momentTitle(sale)}
            {sale.play_name ? ` · ${sale.play_name}` : ""}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {sale.tier_name && <TierChip tier={rawTier(sale.tier_name)} />}
            {reasons.map((r) => (
              <span
                key={r.label}
                className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-data-label"
                style={{ color: r.color, background: r.bg, border: `1px solid ${r.color}55` }}
              >
                {r.label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-[var(--text-faint)]">
            <span>{soldDate(sale.completed_at)}</span>
            {sale.seller_safe_name && <span>{sale.seller_safe_name} →</span>}
            {sale.buyer_safe_name && <span className="text-[var(--text-dim)]">{sale.buyer_safe_name}</span>}
          </div>
        </div>
        <div className="relative h-[200px] md:h-[260px]">
          <Headshot sale={sale} accent={c1} size="hero" priority />
        </div>
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block transition-transform duration-200 hover:scale-[1.004]">
      {body}
    </Link>
  ) : (
    body
  );
}

// ── Category section ─────────────────────────────────────────────────────────
export function SpecialSection({
  theme,
  count,
  rows,
}: {
  theme: Theme;
  count: number;
  rows: SpecialSaleRow[];
}) {
  if (rows.length === 0) return null;
  const cosmicBg = theme.cosmic
    ? {
        background: `linear-gradient(135deg, ${theme.accent}14, transparent 45%, ${theme.accent2 ?? theme.accent}10)`,
      }
    : undefined;
  return (
    <section id={theme.id} className="scroll-mt-20">
      <div
        className={`relative overflow-hidden rounded-lg border border-[var(--border-subtle)] ${theme.cosmic ? "cosmic-drift" : ""}`}
        style={cosmicBg}
      >
        {/* section header */}
        <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-md font-mono text-[18px] glyph-pulse"
            style={{ color: theme.accent, background: theme.fill, border: `1px solid ${theme.accent}40` }}
          >
            {theme.glyph}
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold tracking-section-header text-[var(--text)]">{theme.title}</h2>
              <span className="font-mono text-[10px] tracking-data-label" style={{ color: theme.accent }}>
                {theme.kicker}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">{theme.blurb}</p>
          </div>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-faint)]">
            {count.toLocaleString("en-US")} sales
          </span>
        </header>
        {/* horizontal rail of cards */}
        <div className="rail-scroll flex gap-3 overflow-x-auto p-4">
          {rows.map((sale, i) => (
            <SpecialSaleCard key={sale.transaction_id} sale={sale} theme={theme} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
