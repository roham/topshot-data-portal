import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

// Per design/00 §4.7 / §5: sparse text, optional CTA. No illustrations,
// no emojis. Voice example from 08 §3.6: "Watchlist is empty — search
// for a player to start."
export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="px-3 py-8 text-center">
      <div className="text-[13px] text-[var(--text)]">{title}</div>
      {body && <div className="text-[11px] text-[var(--text-dim)] mt-1 max-w-md mx-auto">{body}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
