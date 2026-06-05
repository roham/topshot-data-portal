// /supply/since-2022 — one-off standalone graph: cumulative minted, burned, and
// locked since June 2022, all rebased to zero. The window opens just before
// locking launched (Jul 2022) and as burns ramped, so it isolates the
// deflation/lock era. Governing spec: specs/001-supply-timeline/spec.md (FR-4)

import type { Metadata } from "next";
import Link from "next/link";
import { getSupplyTimeline, rebaseMonthly } from "@/lib/supabase/queries/supply-timeline";
import { Card } from "@/components/primitives/Card";
import { EmptyState } from "@/components/primitives/EmptyState";
import { RebasedSupplyLines } from "@/components/charts/supply/RebasedSupplyLines";

export const metadata: Metadata = {
  title: "Supply since June 2022 · TS·PORTAL",
  description: "Cumulative NBA Top Shot moments minted, burned, and locked since June 2022 — all from zero.",
};

export const revalidate = 3600;
export const maxDuration = 60;

const FROM = "2022-06-01";

export default async function SupplySince2022Page() {
  const supply = await getSupplyTimeline();

  if (!supply) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-4">
        <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]">Supply since June 2022</h1>
        <div className="mt-4">
          <EmptyState title="Supply timeline not yet populated" />
        </div>
      </main>
    );
  }

  const { monthly } = supply;
  const rebased = rebaseMonthly(monthly, FROM);
  const last = rebased[rebased.length - 1];
  const minted = last?.cumMinted ?? 0;
  const burned = last?.cumBurned ?? 0;
  const locked = last?.netLocked ?? 0;
  const net = minted - burned;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]" data-testid="since-2022-h1">
            Minted, burned & locked — since June 2022
          </h1>
          <p className="text-[11px] text-[var(--text-dim)] mt-1">
            Cumulative, all from zero. Minting (
            <span className="text-[var(--text)] tabular-nums">{minted.toLocaleString("en-US")}</span>) has been almost
            entirely offset by burns (
            <span className="text-[var(--text)] tabular-nums">{burned.toLocaleString("en-US")}</span>) — net new supply{" "}
            <span className={net >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
              {net >= 0 ? "+" : "−"}
              {Math.abs(net).toLocaleString("en-US")}
            </span>{" "}
            — while <span className="text-[var(--text)] tabular-nums">{locked.toLocaleString("en-US")}</span> were locked
            away.
          </p>
        </div>
        <Link href="/supply" className="text-[11px] text-[var(--accent)] hover:underline whitespace-nowrap">
          ← full supply view
        </Link>
      </div>

      <Card variant="default" methodology="Cumulative since June 2022, rebased to zero at the window start. Minted = NFT creation (created_at). Burned = burned_at. Locked = net locked (locks minus unlocks and burns-while-locked). Source: full BigQuery moment history.">
        <RebasedSupplyLines monthly={rebased} />
      </Card>
    </main>
  );
}
