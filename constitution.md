---
scope: repo
applies_to: topshot-data-portal
inherits: Dapper Labs company constitution
version: 0.1.0
ratified: 2026-05-31
last_amended: 2026-05-31
status: ratified
---

# Top Shot Data Portal — Constitution

> The durable spine above every spec, plan, and feature in this repo. It exists to remove
> *interpretation* choices and leave only *execution* choices. Distilled from `research/doctrine.md`
> (Roham's verbatim principles), `research/00-foundation-v2.md`, and `research/00-product-pillars-v3.md`.

**Purpose.** The portal inspires confidence in the Top Shot economy and is a tool for its growth. It
does that by being accurate *and* by shining light on the best parts of the economy — never by
fabricating, never by flattering with false numbers.

---

## Core Principles

### I. Honest data, framed to inspire confidence
The portal tells the truth and is a tool for growth — those are not in tension, they're the craft.
Accuracy and precision are the floor, not the achievement. The work is choosing honest framings,
default views, and time windows that surface the real strength of the economy rather than its most
embarrassing corner. We never fabricate, smooth away, or hide a number — but we lead with the genuine
positive (top sales, standout moments, the rarest parallels) and design every default so that a
screenshot of it is something a holder is proud to share, truthfully.
**Why load-bearing:** remove it and we either lie to look good, or tell the truth in a way that
corrodes the confidence the portal exists to build. Both kill it.

### II. Graphs first, density on the drill
Every page's first level is a wall of relevant charts — never a table, hero, or marketing CTA as
the landing. Tables, raw rows, and terminal-density panels live one click deeper. We accept being
worse at instant raw-data scanning in exchange for being legible the instant a page loads.
**Why load-bearing:** remove it and we drift back to table-first dashboards that look like demo templates.

### III. Best-in-class visualization, design, and performance
Data visualization, visual design, and front-end engineering are first-class work, not finishing
touches. The portal feels delightful — clean, considered, alive — and it is fast, because a pro
collector lives inside it and uses it constantly. No jank, no generic dashboard aesthetic,
sub-perceptible transitions. Delight calibrated to the pro, not to a consumer marketing demo.
**Why load-bearing:** remove it and we ship something correct but lifeless that no collector wants to
open twice.

### IV. Showcase the rarest — every parallel is a story
Each `(set × tier × parallel)` is a distinct market, and the rarest of them — the 1-of-1s, the 5-of-5s,
the special ceramics — are the best of this economy. Surfacing them as their own markets isn't merely
precise; it's the opportunity. The portal's job is to find those stories and tell them, not to bury
them in an aggregate. We mirror the structure the data actually has rather than collapsing it and
losing the highlight.
**Why load-bearing:** remove it and the most inspiring part of the economy disappears into an average.

### V. Senior-analyst voice, never marketing copy
Copy is written in the voice of a sharp research analyst, not a marketer. Every number earns a single
sentence; nothing shouts. No "Explore!", "Discover!", "Trending Now!" — a pro reads that as noise on
an instrument. Precise, confident, written for the collector.
**Why load-bearing:** remove it and marketing fluff reinfects an instrument that has to read as credible.

### VI. Honest absence beats fabricated presence
When a public-API ceiling or a genuine data gap blocks a feature, we document the ceiling with positive
proof and ship the honest partial — never synthesized data, placeholder gradients, AI fill, or
fabricated marks. A genuinely-empty market is framed as opportunity ("🆕 new drop — be first to list"),
but a failed fetch on a data-bearing entity is a bug, never a tolerated empty state.
**Why load-bearing:** remove it and we pretend data exists — the single fastest credibility kill for
this audience.

### VII. Depth before breadth
One canonical surface is made genuinely excellent before the next is started. Ship-count is never a
success metric; "FINAL / done / production-ready" is forbidden vocabulary until exit conditions
actually pass.
**Why load-bearing:** remove it and you get feature-factory sprawl — twenty mediocre routes instead of
one great one.

---

## Standards & Constraints

Concrete bars, verifiable at review time. Specific to this repo (generic engineering standards live
in the company constitution).

**Data fidelity**
- Floor market cap formula is fixed: `Σ(lowest_ask × circulation)` per edition.
- Display the numbers the API returns, as returned. Wash-trade detection is handled as a separate concern — it is **not** a display-time filter that alters the headline numbers.
- Every public-API ceiling that blocks a feature is documented with positive proof on `/methodology`.
- No hardcoded fixture / mock data in production routes — dev-only. Production routes derive from real data or surface honest absence.

**Confidence framing**
- Lead with the honest positive. A polished **Top Sales** section, filterable across time frames, is a flagship surface — surface real standout sales, the rarest parallels, and the best of the economy by default.
- Every default view (window, sort, framing) is chosen so an honest screenshot of it builds confidence rather than embarrasses a holder.

**Charts**
- Every chart renders real data on a data-bearing entity, is filterable, and encodes filter state in the URL (shareable view).
- Mirror the structure the API gives. Where it breaks out parallels, show them as distinct markets and surface the rarest; where a moment is shown without a breakdown, include its parallels rather than hiding them. Don't force aggregation or separation the source data doesn't have.
- Time-window selectors default to whichever of **30D** or **1Y** better represents the data (24H is too sparse for low-volume moments).

**Empty states**
- A cell with `circulation > 0` and `listings = 0` renders "🆕 NEW DROP / be first to list" — never a dash, "Coming Soon," or a silently-collapsed row.

**Real marks only**
- Player headshots from `cdn.nba.com`; moment media from `assets.nbatopshot.com`; team colors from a canonical registry. No placeholder gradients, fabricated logos, or AI fill in production routes.

**Pro-trader interaction floor**
- Keyboard-first: `?` opens shortcuts, `/` focuses filter, `j`/`k` row nav, `g h` home, function-code command bar for jumps.
- Dark mode is the default. Green-up / red-down is sacred. Numeric columns use tabular-nums.
- CSV export is table stakes on any tabular surface.
- Valuation models are transparent and editable by the user — never a black box. Derived numbers carry confidence labels.

**Terminology (inherited LOCKED company rules — sharpened for this repo)**
- "Flow Network," never the forbidden technical-primitive form.
- Never the [W-word]. Top-holder concentration is branded **VIP**: the `/whales` route → `/vip`; the "[W-word] Concentration Index" → "VIP Concentration." The external NFTGo metric name appears only in internal research citations.

---

## Governance

This constitution supersedes ad-hoc practice. Compliance is verified at the spec/plan gates and in
review — by structure, not by intention. The autonomous loop's Judge tests against these principles
and standards; a feature that violates any of I–VII or any standard does not ship.

Amendments require: a written rationale, Roham's sign-off, a version bump, and a migration note. When
a principle is proven wrong, correct it in place with a dated "was wrong because —" note; never let
stale guidance stand beside new.

Relationship to `research/doctrine.md`: doctrine is the long-form, verbatim-quotable canon with
current-phase scope and per-feature comparable mappings. This constitution is the short-form evergreen
spine. Where they agree, doctrine is the elaboration. Where current-state appears (e.g. market-cap-first
scope), it lives in doctrine, not here.

Version: **0.1.0** | Ratified: **2026-05-31** | Last amended: **2026-05-31**
