import Link from "next/link";
import { formatUsd } from "@/lib/utils";

interface ListedSerial {
  flowId: string;
  serial: number;
  lowAsk: number;
  circulation: number;
}

export function EdgeBoard({
  listed,
  currentSerial,
  fairValue,
}: {
  listed: ListedSerial[];
  currentSerial: number;
  fairValue: number | null;
}) {
  if (!listed.length || fairValue == null) {
    return (
      <div className="text-sm text-[var(--text-faint)] px-4 py-3">
        No listed serials returned for this edition — no edge signal available.
      </div>
    );
  }
  // Mark serials below fair value as "edge up", above as "edge down"
  const sorted = [...listed].sort((a, b) => a.lowAsk - b.lowAsk);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];
  // T4 — floor compression: how many listings sit within +20% of the cheapest.
  const compressionCount = sorted.filter((l) => l.lowAsk <= cheapest.lowAsk * 1.2).length;
  const compressionPct = (compressionCount / sorted.length) * 100;
  return (
    <div>
      <div className="grid sm:grid-cols-4 gap-px bg-[var(--border)] text-[12px]">
        <Cell label="Listed serials" value={`${listed.length}`} />
        <Cell label="Cheapest" value={formatUsd(cheapest.lowAsk)} sub={`#${cheapest.serial}`} />
        <Cell label="Most expensive" value={formatUsd(mostExpensive.lowAsk)} sub={`#${mostExpensive.serial}`} />
        <Cell label="Floor compression" value={`${compressionPct.toFixed(0)}%`} sub={`${compressionCount} within +20%`} />
      </div>
      <div className="divide-y divide-[var(--border)] text-[12px] font-mono mt-2">
        {sorted.slice(0, 12).map((l) => {
          const vsfair = ((l.lowAsk - fairValue) / fairValue) * 100;
          const isCurrent = l.serial === currentSerial;
          return (
            <Link
              key={l.flowId}
              href={`/moment/${l.flowId}`}
              className={`px-4 py-1.5 flex items-baseline gap-3 ${isCurrent ? "bg-[var(--accent)]/8" : "hover:bg-[var(--bg-elev)]"}`}
            >
              <span className="tnum w-16">#{l.serial}/{l.circulation}</span>
              <span className="tnum text-sm flex-1 text-right">{formatUsd(l.lowAsk)}</span>
              <span className={`tnum text-xs w-16 text-right ${vsfair < -10 ? "text-[var(--up)]" : vsfair > 10 ? "text-[var(--down)]" : "text-[var(--text-faint)]"}`}>
                {vsfair >= 0 ? "+" : ""}{vsfair.toFixed(0)}%
              </span>
              {isCurrent && <span className="text-[10px] text-[var(--accent)] uppercase tracking-wider ml-2">this</span>}
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--text-faint)] px-4 py-2">
        Edge column compares each listed serial's lowAsk to this moment's fair value. Negative % = listed below fair = potential edge up. Positive % = listed above fair = no edge or overpriced.
      </p>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-base font-semibold tnum mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-faint)] tnum">{sub}</div>}
    </div>
  );
}
