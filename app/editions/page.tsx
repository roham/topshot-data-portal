import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Editions · directory · coming soon"
      job="Searchable list of every edition with floor, circulation, recent volume, and per-set context."
      data="searchEditions paged across active sets; floor sampling per row; depth-tab link into /edition/[id]."
      status="Scheduled for iter-6+. The /edition/[id] deep-dive ships first (already live)."
    />
  );
}
