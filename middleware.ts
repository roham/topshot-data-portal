// Supabase session refresh middleware.
// Runs on every request matching the matcher below; refreshes the user's
// session cookies if expired. Required for any auth-protected feature.
//
// For the MVP the portal is anon-only (public market data + RLS), so this is
// effectively a no-op now. Wired up early so when user_state.* tables ship
// (watchlists, alerts), auth Just Works.

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Public routes that bypass the Supabase auth-touch — they ship anon-only
// data and benefit from Vercel CDN caching. Any auth side-effect (cookie read
// or write) in middleware marks the response private/uncacheable, which
// defeats the s-maxage=60 + stale-while-revalidate=300 headers configured
// in next.config.ts. When user-state surfaces ship (watchlists, alerts),
// drop the matching route from this set.
const PUBLIC_NO_AUTH_PATHS = new Set<string>(["/"]);

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip auth-touch on public anon-only routes so the response stays
  // CDN-cacheable per the Cache-Control header in next.config.ts.
  if (PUBLIC_NO_AUTH_PATHS.has(request.nextUrl.pathname)) {
    return supabaseResponse;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session to trigger refresh-if-expired.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static + public assets; run on every page + api route.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
