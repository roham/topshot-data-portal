import { DEFAULT_RULES } from "@/lib/valuation/rules";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";

export const metadata = { title: "Rules · valuation engine · TS·PORTAL" };

export default function RulesPage() {
  const r = DEFAULT_RULES;
  const tierEntries = Object.entries(r.editionTierMultipliers);
  const parallelEntries = Object.entries(r.parallelMultipliers).map(([k, v]) => ({ id: Number(k), mult: v }));
  return (
    <div className="max-w-[1080px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Rules</h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1">
          The valuation engine that drives <em>fair value</em> on every moment page and portfolio. Base fair value
          comes from the recent-comps median for the same edition; rules below adjust it for serial rarity, jersey
          match, parallel, and tier. Editable tuner UI is deferred to a follow-on iter; the engine itself is live.
        </p>
      </header>

      <Card title="Serial-level premiums" methodology="Walked in order against the moment's serial number; first match wins. Premium expressed as a multiplier — +1.00 = +100%.">
        <div className="divide-y divide-[var(--border-subtle)]">
          <Row label="Serial #1 premium" value={`+${(r.serial1Premium * 100).toFixed(0)}%`} note="Rookie / capstone serial. Highest single-serial premium." />
          {r.lowSerialTiers.map((t) => (
            <Row
              key={t.threshold}
              label={`Serial ≤ ${t.threshold} premium`}
              value={`+${(t.premium * 100).toFixed(0)}%`}
              note={t.threshold === 10 ? "Top-10 serial band" : t.threshold === 100 ? "Top-100 band" : "Mid-rare band"}
            />
          ))}
          <Row label="Last serial premium" value={`+${(r.lastSerialPremium * 100).toFixed(0)}%`} note="Final mint of the edition — capstone of the run." />
          <Row label="Jersey-number match" value={`+${(r.jerseyPremium * 100).toFixed(0)}%`} note="Serial number equals the player's jersey number for that moment." />
        </div>
      </Card>

      <Card title="Tier multipliers" methodology="Applied multiplicatively on top of any serial premium. Higher tier = scarcer overall edition.">
        <div className="divide-y divide-[var(--border-subtle)]">
          {tierEntries.map(([tier, mult]) => (
            <div key={tier} className="px-1 py-2 flex items-center gap-3">
              <TierChip tier={tier} />
              <span className="ml-auto tnum text-[14px]">
                <Num value={mult} format="int" precision={2} />×
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Parallel multipliers" methodology="parallelID 0 = base. Higher parallelIDs typically reflect rarer cosmic / holo / colored variants. Users add custom parallelIDs by editing rules locally (tuner UI pending).">
        <div className="divide-y divide-[var(--border-subtle)]">
          {parallelEntries.map((p) => (
            <Row
              key={p.id}
              label={p.id === 0 ? "Parallel #0 (Base)" : `Parallel #${p.id}`}
              value={`${p.mult.toFixed(2)}×`}
              note={p.id === 0 ? "No premium" : p.id === 1 ? "Typical Anthology / first parallel" : p.id === 2 ? "Holo-class" : "In-Color and beyond"}
            />
          ))}
        </div>
      </Card>

      <Card title="Confidence thresholds" methodology="Number of recent comps required for a confidence label. Surfaces on /moment/[flowId] under the fair-value cell.">
        <div className="divide-y divide-[var(--border-subtle)]">
          <Row label="High confidence" value={`≥ ${r.confidence.high} comps`} note="Recent same-edition sales within window." />
          <Row label="Medium confidence" value={`≥ ${r.confidence.medium} comps`} />
          <Row label="Low confidence" value={`< ${r.confidence.medium} comps`} note="Fair-value still computed but explicitly flagged thin." />
        </div>
      </Card>

      <Card title="Status">
        <ul className="text-[12px] text-[var(--text)] space-y-2 leading-relaxed">
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Tuner UI</span>
            <span className="text-[var(--text-dim)]">
              The interactive sliders + save-config UI that V1 shipped is being rebuilt against the new design system. Default rules above are what every fair-value calculation on the site uses right now.
            </span>
          </li>
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Engine source</span>
            <span className="text-[var(--text-dim)]">
              <code className="font-mono text-[var(--text)]">lib/valuation/index.ts</code> + <code className="font-mono text-[var(--text)]">lib/valuation/rules.ts</code>. 22 unit tests at <code className="font-mono text-[var(--text)]">lib/valuation/index.test.ts</code> guard the rule semantics; tests run on every build.
            </span>
          </li>
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Where this engine&apos;s output appears</span>
            <span className="text-[var(--text-dim)]">
              Fair-value cell on /moment/[flowId], PnL column on /u/[username], the Sniper feed&apos;s mispricing threshold (once /sniper ships), and the Depth ladder&apos;s reference-line for fair vs. floor.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="px-1 py-2 grid grid-cols-[1fr_auto] items-baseline gap-3">
      <div>
        <div className="text-[12px] text-[var(--text)]">{label}</div>
        {note && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{note}</div>}
      </div>
      <span className="tnum text-[14px] text-[var(--text)]">{value}</span>
    </div>
  );
}
