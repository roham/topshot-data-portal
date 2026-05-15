import { redirect } from "next/navigation";

// `/sales` is the deep-link target for the homepage's Largest Sales block
// (V3 iter-1 spec §1 Block 3). Existing canonical surface is /archive — alias
// rather than rename to keep prior permalinks alive.
export default function SalesAlias() {
  redirect("/archive");
}
