import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "topshot" }, auth: { persistSession: false } },
);

const { count: moments_with_owner } = await sb.from("moments").select("*", { count: "exact", head: true }).not("owner_flow_address", "is", null);
const { count: total_moments } = await sb.from("moments").select("*", { count: "exact", head: true });
const { count: collectors_total } = await sb.from("collectors").select("*", { count: "exact", head: true });
const { count: collectors_named } = await sb.from("collectors").select("*", { count: "exact", head: true }).not("username", "is", null);

console.log(JSON.stringify({
  moments_with_owner,
  total_moments,
  pct: ((moments_with_owner / total_moments) * 100).toFixed(1) + "%",
  collectors_total,
  collectors_named,
}, null, 2));
