import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Alerts · coming soon"
      job="Define alerts on editions, players, collectors; trigger on floor crosses, volume spikes, and watched-wallet activity."
      data="Definitions in localStorage + URL-shareable rules; triggers evaluated client-side against accumulator reads."
      status="Scheduled for iter-15+. Persistence layer + notification design still pending."
    />
  );
}
