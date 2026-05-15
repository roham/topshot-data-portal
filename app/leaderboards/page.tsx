import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Leaderboards · anonymous score ladders · coming soon"
      job="Per-player and per-team leaderboards as returned by the public API."
      data="getLeaderboard(kind, id). Entries are { rank, score } only — Ceiling 7 confirms no collector identity is exposed."
      status="Scheduled for iter-7+. Honest disclosure: identity is structurally unavailable; the ladder is anonymous."
    />
  );
}
