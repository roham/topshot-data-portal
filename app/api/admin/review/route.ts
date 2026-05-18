// GET  /api/admin/review — returns all feature_reviews rows as JSON array,
//                          ordered by created_at DESC.
// POST /api/admin/review — upsert vote + comment on a feature_review row.
//                          Body: { iteration_id, vote, comment? }
//
// Auth: Bearer token in Authorization header OR x-admin-token header,
//       compared against process.env.ADMIN_REVIEW_TOKEN.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Untyped service-role client for feature_reviews writes.
// The main supabaseAdmin() client uses a hand-rolled AdminDatabase type that
// lacks Insert/Update sub-types for feature_reviews (new table not in the
// type definition yet). Using createClient with unknown DB type sidesteps the
// "Argument of type X is not assignable to parameter of type 'never'" error
// without changing the shared admin.ts.
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

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sb = getWriteClient();
    const { data, error } = await sb
      .from("feature_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { iteration_id?: string; vote?: string; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { iteration_id, vote, comment } = body;

  if (!iteration_id || typeof iteration_id !== "string") {
    return NextResponse.json({ error: "iteration_id required" }, { status: 400 });
  }
  if (!vote || !["✓", "✗", "🎨"].includes(vote)) {
    return NextResponse.json(
      { error: "vote must be one of: ✓ ✗ 🎨" },
      { status: 400 },
    );
  }

  try {
    const sb = getWriteClient();

    // Find the row by iteration_id first
    const { data: existing, error: findError } = await sb
      .from("feature_reviews")
      .select("id")
      .eq("iteration_id", iteration_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: `No feature_review found for iteration_id: ${iteration_id}` },
        { status: 404 },
      );
    }

    const { data: updated, error: updateError } = await sb
      .from("feature_reviews")
      .update({
        vote,
        comment: comment ?? null,
        voted_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
