// Browser-side Supabase client. Anon key only — never service-role.
// Default schema pinned to `topshot` so .from('mv_*') resolves without prefix.

import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "topshot" } },
  );
}
