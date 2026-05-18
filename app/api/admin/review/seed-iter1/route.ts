// POST /api/admin/review/seed-iter1 — inserts the bootstrap iteration-1
// proposal row into topshot.feature_reviews (idempotent: uses ON CONFLICT
// handled by checking for existing row first).
//
// No request body needed.
// Auth: Bearer token in Authorization header compared against ADMIN_REVIEW_TOKEN.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Untyped service-role client — feature_reviews is not in the hand-rolled
// AdminDatabase type yet so using createClient directly avoids insert type errors.
function getWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "topshot" },
  });
}

export const runtime = "nodejs";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_REVIEW_TOKEN;
  if (!expected) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === expected;
  }
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken) {
    return adminToken === expected;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sb = getWriteClient();

    // Idempotent: check if iteration-1 row already exists
    const { data: existing } = await sb
      .from("feature_reviews")
      .select("id")
      .eq("iteration_id", "loop-a-1")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        message: "Iteration 1 bootstrap row already exists",
        id: existing.id,
        already_existed: true,
      });
    }

    const { data, error } = await sb
      .from("feature_reviews")
      .insert({
        iteration_id: "loop-a-1",
        loop: "A",
        track: "BOOTSTRAP",
        proposal:
          "Built /admin/review supervision surface (migration, page, API). This is the bootstrap iteration. Cross-vendor review runs even without prior CEO signal. Verify: migration 0015 applied, GET /api/admin/review returns rows, POST /api/admin/review upserts vote correctly, /admin/review renders the review list.",
        diff_preview:
          "supabase/migrations/0015_topshot_feature_reviews.sql\napp/admin/review/page.tsx\napp/api/admin/review/route.ts\napp/api/admin/review/seed-iter1/route.ts",
        axis_scores: {
          a4_schema_correctness: 95,
          a5_organization: 90,
          note: "bootstrap iteration — data axes not applicable",
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Seeded iteration 1 bootstrap row", data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
