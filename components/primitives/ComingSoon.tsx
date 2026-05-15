import { Card } from "./Card";

export interface ComingSoonProps {
  /** Top-line title, e.g. "Movers · coming soon" or "Tatum · per-player surface · coming soon" */
  title: string;
  /** One-sentence trader job-to-be-done */
  job: string;
  /** GraphQL queries / accumulator cadences that will feed this surface */
  data: string;
  /** What's currently blocking the full build, OR "Scheduled for iter-N" */
  status: string;
  /** Optional scope phrase rendered in mono under the title (e.g. param-aware entity scope) */
  scope?: string;
}

// Stub surface used by every route the IA names but the design reset
// hasn't yet rebuilt. Three lines in senior-research-analyst register:
// what the surface will show, what feeds it, what's gating the full build.
export function ComingSoon({ title, job, data, status, scope }: ComingSoonProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
        {scope && (
          <p className="text-[11px] font-mono text-[var(--text-faint)] mt-0.5">{scope}</p>
        )}
      </header>
      <Card title="Status" methodology="This surface is documented in the V2 information architecture (`design/01-information-architecture.md`) and will land via the iter loop.">
        <ul className="text-[12px] text-[var(--text)] space-y-2 leading-relaxed">
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Job</span>
            {job}
          </li>
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Data feeds</span>
            <span className="text-[var(--text-dim)]">{data}</span>
          </li>
          <li>
            <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block">Gating</span>
            <span className="text-[var(--text-dim)]">{status}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
