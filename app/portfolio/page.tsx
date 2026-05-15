import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Portfolio · lookup · coming soon"
      job="Quick entry to a collector's portfolio without typing a username — a single input that resolves to /u/[username] or /u/0x..."
      data="Same as the TopNav search resolver; uses getUserByUsername / getUserByFlow."
      status="Stubbed pending unification. Use the TopNav search field in the meantime — it works."
    />
  );
}
