import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Compare · cross-collector · coming soon"
      job="Side-by-side bag overlap, suggested swaps, value delta between two collectors."
      data="Two parallel bag pulls via fetchBagPage; overlap math + value-difference math client-side."
      status="Scheduled for iter-10+. The hint already surfaces on /u/[username]?vs={other}."
    />
  );
}
