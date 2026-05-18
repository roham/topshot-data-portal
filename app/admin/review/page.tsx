// /admin/review — CEO supervision surface for Loop A + Loop B iterations.
//
// Token-guarded: compare ?token=<value> query param OR x-admin-token header
// against process.env.ADMIN_REVIEW_TOKEN. Missing/mismatch → 401.
//
// Reads all rows from topshot.feature_reviews ordered by created_at DESC.
// Renders proposal, axis scores, cross-vendor verdict, vote status, and a
// vote form (✓ / ✗ / 🎨 + comment) that posts to /api/admin/review.
//
// This is an internal tool. Functional over beautiful.

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Untyped service-role client for feature_reviews reads.
// The hand-rolled AdminDatabase type doesn't include feature_reviews yet.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "topshot" },
  });
}

export const metadata = { title: "Review · TS·PORTAL admin" };
export const dynamic = "force-dynamic";

interface FeatureReview {
  id: string;
  iteration_id: string;
  loop: string;
  track: string;
  proposal: string | null;
  diff_preview: string | null;
  axis_scores: Record<string, unknown> | null;
  cross_vendor_verdict: string | null;
  cross_vendor_path: string | null;
  rendered_screenshot_url: string | null;
  comparable_screenshot_url: string | null;
  vote: string | null;
  comment: string | null;
  voted_at: string | null;
  created_at: string;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    PASS: { label: "PASS", cls: "bg-green-900 text-green-200 border-green-700" },
    FAIL: { label: "FAIL", cls: "bg-red-900 text-red-200 border-red-700" },
    "NEEDS-WORK": { label: "NEEDS-WORK", cls: "bg-yellow-900 text-yellow-200 border-yellow-700" },
  };
  const entry = verdict ? map[verdict] : null;
  if (!entry) {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded border bg-gray-800 text-gray-400 border-gray-600">
        no verdict
      </span>
    );
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-mono rounded border ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function VoteBadge({ vote }: { vote: string | null }) {
  if (!vote) {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded border bg-gray-800 text-gray-400 border-gray-600">
        awaiting
      </span>
    );
  }
  const map: Record<string, string> = {
    "✓": "bg-green-900 text-green-200 border-green-700",
    "✗": "bg-red-900 text-red-200 border-red-700",
    "🎨": "bg-yellow-900 text-yellow-200 border-yellow-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-mono rounded border ${map[vote] ?? "bg-gray-800 text-gray-400 border-gray-600"}`}
    >
      {vote}
    </span>
  );
}

export default async function ReviewPage({ searchParams }: PageProps) {
  // Token auth: check query param or header
  const sp = await searchParams;
  const tokenParam = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const headerStore = await headers();
  const tokenHeader = headerStore.get("x-admin-token");
  const provided = tokenParam ?? tokenHeader ?? null;
  const expected = process.env.ADMIN_REVIEW_TOKEN;

  if (!expected || !provided || provided !== expected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold">401</p>
          <p className="text-sm text-gray-400">
            Access denied. Provide <code className="font-mono">?token=&lt;value&gt;</code> or{" "}
            <code className="font-mono">x-admin-token</code> header.
          </p>
        </div>
      </div>
    );
  }

  // Fetch reviews using service-role client (bypasses RLS)
  let reviews: FeatureReview[] = [];
  let fetchError: string | null = null;
  try {
    const sb = getAdminClient();
    if (!sb) {
      fetchError = "Supabase credentials not configured";
    } else {
    const { data, error } = await sb
      .from("feature_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      fetchError = error.message;
    } else {
      reviews = (data ?? []) as FeatureReview[];
    }
    }
  } catch (err) {
    fetchError = (err as Error).message;
  }

  const pendingCount = reviews.filter((r) => r.vote === null).length;
  const tokenForForms = provided;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            /admin/review — Loop supervision
          </h1>
          <p className="text-sm text-gray-400">
            Loop A + B iteration proposals. Vote ✓ / ✗ / 🎨 to signal to the orchestrator.
          </p>
          <p className="text-xs font-mono text-gray-500">
            {pendingCount} review{pendingCount !== 1 ? "s" : ""} pending vote
          </p>
        </header>

        {/* Error state */}
        {fetchError && (
          <div className="rounded border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
            <strong>Supabase error:</strong> {fetchError}
          </div>
        )}

        {/* Empty state */}
        {!fetchError && reviews.length === 0 && (
          <div className="rounded border border-gray-700 bg-gray-900 px-6 py-8 text-center space-y-4">
            <p className="text-gray-400 text-sm">No reviews yet.</p>
            <SeedButton token={tokenForForms} />
          </div>
        )}

        {/* Review list */}
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} token={tokenForForms} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review: r, token }: { review: FeatureReview; token: string }) {
  const proposalText = r.proposal
    ? r.proposal.length > 500
      ? r.proposal.slice(0, 500) + "..."
      : r.proposal
    : null;

  return (
    <div className="rounded border border-gray-700 bg-gray-900 divide-y divide-gray-800">
      {/* Card header */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-semibold text-white">{r.iteration_id}</span>
        <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
          Loop {r.loop}
        </span>
        <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
          {r.track}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <VerdictBadge verdict={r.cross_vendor_verdict} />
          <VoteBadge vote={r.vote} />
        </div>
      </div>

      {/* Proposal */}
      {proposalText && (
        <div className="px-5 py-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1">
            Proposal
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {proposalText}
          </p>
        </div>
      )}

      {/* Axis scores */}
      {r.axis_scores && (
        <div className="px-5 py-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1">
            Axis scores
          </div>
          <pre className="text-xs font-mono text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto">
            <code>{JSON.stringify(r.axis_scores, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Diff preview */}
      {r.diff_preview && (
        <div className="px-5 py-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1">
            Files changed
          </div>
          <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">
            {r.diff_preview}
          </pre>
        </div>
      )}

      {/* Comment (if voted) */}
      {r.comment && (
        <div className="px-5 py-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1">
            Comment
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{r.comment}</p>
        </div>
      )}

      {/* Vote form */}
      <div className="px-5 py-4">
        <VoteForm iterationId={r.iteration_id} currentVote={r.vote} token={token} />
      </div>

      {/* Footer */}
      <div className="px-5 py-2 flex items-center gap-4 text-[10px] font-mono text-gray-600">
        <span>created {fmtTimestamp(r.created_at)}</span>
        {r.voted_at && <span>voted {fmtTimestamp(r.voted_at)}</span>}
      </div>
    </div>
  );
}

// Vote form — client-side JS via native form POST + fetch.
// We keep this as a server-rendered form using the action URL pattern so it
// works even without JS, but we also provide inline JS for UX.
function VoteForm({
  iterationId,
  currentVote,
  token,
}: {
  iterationId: string;
  currentVote: string | null;
  token: string;
}) {
  const formId = `vote-form-${iterationId.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-2">
        Cast vote
      </div>
      <form
        id={formId}
        data-iteration-id={iterationId}
        data-token={token}
        className="space-y-3"
        onSubmit={undefined}
      >
        <div className="flex gap-2">
          {(["✓", "✗", "🎨"] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-vote={v}
              data-form={formId}
              className={`px-4 py-1.5 rounded text-sm font-mono border transition-colors cursor-pointer
                ${
                  currentVote === v
                    ? v === "✓"
                      ? "bg-green-800 border-green-600 text-green-100"
                      : v === "✗"
                        ? "bg-red-800 border-red-600 text-red-100"
                        : "bg-yellow-800 border-yellow-600 text-yellow-100"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              onClick={undefined}
            >
              {v}
            </button>
          ))}
        </div>
        <textarea
          name="comment"
          placeholder="Optional comment..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none"
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded text-sm font-mono text-gray-200 transition-colors cursor-pointer"
        >
          Submit vote
        </button>
        <span
          className="ml-3 text-xs font-mono text-gray-500 vote-status"
          data-form={formId}
        />
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var formId = ${JSON.stringify(formId)};
  var form = document.getElementById(formId);
  if (!form) return;
  var selectedVote = ${JSON.stringify(currentVote ?? "")};
  var iterationId = form.getAttribute('data-iteration-id');
  var token = form.getAttribute('data-token');

  form.querySelectorAll('button[data-vote]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectedVote = btn.getAttribute('data-vote');
      form.querySelectorAll('button[data-vote]').forEach(function(b) {
        b.classList.remove('ring-2', 'ring-white');
      });
      btn.classList.add('ring-2', 'ring-white');
    });
  });

  form.querySelector('button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    if (!selectedVote) { alert('Select a vote first (✓ / ✗ / 🎨)'); return; }
    var comment = form.querySelector('textarea[name="comment"]').value;
    var statusEl = document.querySelector('.vote-status[data-form="' + formId + '"]');
    if (statusEl) statusEl.textContent = 'Saving...';
    fetch('/api/admin/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ iteration_id: iterationId, vote: selectedVote, comment: comment })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) {
        if (statusEl) statusEl.textContent = 'Error: ' + data.error;
      } else {
        if (statusEl) statusEl.textContent = 'Saved! Reload to see updated badge.';
      }
    }).catch(function(err) {
      if (statusEl) statusEl.textContent = 'Network error: ' + err.message;
    });
  });
})();
          `,
        }}
      />
    </div>
  );
}

function SeedButton({ token }: { token: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Seed the iteration 1 bootstrap proposal to get started.
      </p>
      <button
        type="button"
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded text-sm font-mono text-gray-200 transition-colors cursor-pointer"
      >
        Seed iteration 1 bootstrap proposal
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var btn = document.currentScript.previousElementSibling;
  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Seeding...';
    fetch('/api/admin/review/seed-iter1', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + ${JSON.stringify(token)} }
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) {
        btn.textContent = 'Error: ' + data.error;
        btn.disabled = false;
      } else {
        btn.textContent = 'Seeded! Reloading...';
        setTimeout(function() { window.location.reload(); }, 800);
      }
    }).catch(function(err) {
      btn.textContent = 'Error: ' + err.message;
      btn.disabled = false;
    });
  });
})();
          `,
        }}
      />
    </div>
  );
}
