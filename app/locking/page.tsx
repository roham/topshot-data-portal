import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Locking dashboard · gated"
      job="Track active challenges and which moments are locked into them with per-challenge top owners."
      data="searchChallenges returns a UserChallenges envelope (STAGE-1 UNLOCK-03) — appears to be auth-scoped, so an authenticated probe is needed before a public surface ships."
      status="GATED on the UNLOCK-03 auth-context follow-up probe. Not yet feasible without an authenticated GraphQL session."
    />
  );
}
