// Server-only admin (service-role) Supabase client.
// Bypasses RLS. NEVER import this from a "use client" file or pass through
// to client components. Reserved for narrow privileged reads (e.g. raw
// etl._etl_cursors when surfacing per-table sync state) and any future
// privileged server-action writes.
//
// Throws at call-time when SUPABASE_SERVICE_ROLE_KEY is missing — call sites
// MUST handle the absence gracefully when running in environments without
// the secret (local dev, preview deploys).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Minimal Database generic so `db.schema: 'topshot'` typechecks under the
// strict supabase-js client. Tables on this client are accessed as `from('x')`
// returning `any`-shaped rows; callers cast to the row types in
// database.types.ts. We could grow this to a strongly-typed schema later by
// running `supabase gen types` when creds are wired.
type AdminDatabase = {
  __InternalSupabase: { PostgrestVersion: "12" };
  topshot: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  etl: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let _cached: SupabaseClient<AdminDatabase, "topshot"> | null = null;

export function supabaseAdmin() {
  if (_cached) return _cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New Supabase env: SUPABASE_SECRET_KEY (sb_secret_*). Falls back to legacy
  // SUPABASE_SERVICE_ROLE_KEY (eyJ... JWT) for backward compat with older keys.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "supabaseAdmin() requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  _cached = createClient<AdminDatabase, "topshot">(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "topshot" },
    global: { headers: { "x-application-name": "topshot-portal-admin" } },
  });
  return _cached;
}
