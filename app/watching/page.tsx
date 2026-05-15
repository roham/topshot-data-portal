import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Watching · watchlist · coming soon"
      job="Add / remove / reorder 5–50 watched collector addresses; the feed shows every event involving them."
      data="Client-side localStorage list, URL-shareable; events parsed from the recent tx feed."
      status="Scheduled for iter-7+. Hooks into /feed when that surface ships."
    />
  );
}
