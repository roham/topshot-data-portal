import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Trends · macro time-series · coming soon"
      job="Macro charts of total marketplace volume, unique buyers, mean price, and tier mix at the global TimeWindow."
      data="30m-market accumulator series; consumes the useTimeWindow hook for window selection."
      status="Scheduled after the global TimeWindow infra (iter-5)."
    />
  );
}
