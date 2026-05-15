import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const scope = `for ${username}`;
  return (
    <ComingSoon
      title="Sets · per-user set-completion · coming soon"
      scope={scope}
      job="Per-collector set-completion view — % complete, missing pieces at floor, total cost-to-complete, +20% squeeze projection per set this collector touches."
      data="Cross-join of the user's bag with setDetail.plays + editionsInSet + editionListedSerials for cost-to-complete."
      status="Scheduled for iter-9+."
    />
  );
}
