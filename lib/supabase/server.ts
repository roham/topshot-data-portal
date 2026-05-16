// Server-side Supabase clients.
//
// Two flavors, deliberately separate:
//
//   getSupabaseServer()    — cookie-bearing client for user-auth flows.
//                            Reads next/headers cookies(). CANNOT be called
//                            inside `unstable_cache()` because cookies() is a
//                            Dynamic API and Next forbids it inside cache
//                            scopes. Use this from route handlers + RSCs that
//                            need the authenticated session.
//
//   getSupabaseServerAnon()— no cookies. Safe inside `unstable_cache()`. Use
//                            this for every public-data read (every MV query
//                            in lib/supabase/queries/* uses this).
//
// Both pin `db.schema = 'topshot'`.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cached singleton for the anon (cookie-free) path. The same client is reused
// across every request — anon reads don't carry per-request state.
let _anonCached:
  | ReturnType<typeof createServerClient>
  | null = null;

// Returns null when env vars are unset so callers short-circuit to empty
// results instead of letting the supabase-js constructor throw a noisy
// "URL and Key are required" error during builds.
export function getSupabaseServerAnon():
  | ReturnType<typeof createServerClient>
  | null {
  if (_anonCached) return _anonCached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  _anonCached = createServerClient(url, key, {
    db: { schema: "topshot" },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op — anon client never writes cookies
      },
    },
  });
  return _anonCached;
}

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "topshot" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: { name: string; value: string; options: CookieOptions }[]) {
          // RSC may not allow setting cookies depending on context; ignore
          // safely. Route handlers calling this can set cookies themselves.
          try {
            for (const { name, value, options } of items) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // best-effort
          }
        },
      },
    },
  );
}
