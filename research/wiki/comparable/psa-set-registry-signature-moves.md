# PSA Set Registry — Signature Moves

**Captures:** NONE in repo. PSA's Set Registry is at psacard.com/auctionprices and psasetregistry.com; public but not yet captured.
**Doctrine reference:** §0.2 — set completion as game mechanic. Per doctrine: *"Set completion as game mechanic. Pop-by-grade equivalent (we use circulation-by-tier-and-parallel). Per-set leaderboard."*
**Status:** Text-descriptive. Most relevant for /sets and /set/[id] page briefs.

---

## §1 — Set completion as game mechanic

PSA's Set Registry is a competitive collector ecosystem. Collectors submit their cards graded by PSA, and the Registry tracks:
- Set completion % (cards owned ÷ cards required)
- GPA (Grade Point Average) — average grade across the set's cards
- "Best of Registry" award for highest-graded complete set
- Per-set leaderboard of top collectors by completion + GPA

The COMPETITIVE element is the signature move. Set completion is a status game; the Registry is the scoreboard.

**Port for /sets and /set/[id]:**
- /set/[id] shows completion histogram (J5 canonical) — how many users at each completion level
- /set/[id] shows leaderboard: top collectors of THIS set by completion % (defer to post-Phase-B once owner_flow_address lands)
- /sets listing has a "completion-rarity" column: % of users who have full completion
- No GPA equivalent (Top Shot moments aren't graded the same way) — instead use Top Shot Score

**Reject:** "achievements" UI badges (gamification per persona doc rejects). The leaderboard alone is the game mechanic.

---

## §2 — Pop-by-grade reports

PSA publishes "population reports" — how many copies of each card exist at each grade level. PSA-10 of card X = N copies graded; PSA-9 = M copies, etc.

**Port — recast per doctrine §0.2:** *"Pop-by-grade equivalent (we use circulation-by-tier-and-parallel)."*

For our domain:
- Per moment: circulation broken by status (Owned / Listings / Locked / In Pack / Locker / Burned) — already in J4 acceptance
- Per edition: circulation by parallel (Base / Diamond / Anthology / etc.) — needs sibling-editions ETL
- Per set: circulation breakdown by tier and by parallel within the set

The "supply structure" is the signature insight — PSA reports it by grade, we report it by tier+parallel.

**Reject:** opaque "rarity rank" algorithms (PSA's reports are transparent population counts; we use circulation directly).

---

## §3 — Per-set leaderboard format

PSA's per-set leaderboard:
- Rank (#1, #2, ...)
- Collector name (or anonymized handle)
- Completion %
- GPA
- "Date last updated"
- Link to that collector's submitted set

**Port for /set/[id] leaderboard (Phase B+ / DEEPENING):**
- Rank + collector username + completion % + average Top Shot Score
- Link to /u/[username] for each collector
- BLOCKED until Loop A §P0.1 owner_flow_address backfill completes

**Reject:** anonymized handles (we surface real Top Shot usernames per the on-chain public-flow-address pattern).

---

## §4 — The completion histogram pattern (J5 canonical)

PSA shows the distribution of completion percentages across all registered collectors for a given set: histogram with completion% bins on x-axis, collector count on y-axis. Right-skewed (most collectors are partially complete; the tail is the elite).

**Port — J5 canonical per `pro-trader.md`:**
- `/set/[id]` renders this exact pattern
- Data source: `mv_set_completion_distribution` (already exists)
- Bars: completion-count (0/56, 1/56, ..., 56/56) on x, user-count on y
- Hover: exact user count + click drills to /set/[id]/leaderboard?completion=N

**Reject:** smoothed line chart instead of histogram (bars more accurately convey count distribution); collapsing the tail (the elite collectors are the data point of interest).

---

## §5 — Historical price index per set

PSA tracks the price history of sets (the SMR — "Sports Market Report" — index). Per-set price index over time, similar to a stock index.

**Port:**
- /set/[id] hero chart per Card Ladder dashboard-02 pattern
- "Set market cap over time" — sum of all moments in the set × their floors over time
- Same signature as Card Ladder's per-category index chart

**Reject:** weighted-average-grade-adjusted indices (Card Ladder does this; PSA does it; too complex for V1 — we use simple sum).

---

## §6 — Set definition rigor

PSA Set Registry defines "what's in this set" precisely. Each set has a CANONICAL list of cards required for completion. No ambiguity.

**Port — this is already true in Top Shot:**
- Each `sets` row has a `set_id` and via `editions.set_id` we know exactly which editions belong
- Completion = (distinct edition_ids owned in set X) / (total edition_ids in set X)
- Use `mv_set_completion_distribution`'s definition

**Reject:** fuzzy "set" definitions (informal categorizations) — only formal `topshot.sets` rows are "sets" per the portal.

---

## §7 — What we DON'T port

- Grading vocabulary (PSA-10, PSA-9, etc. — no analog; Top Shot has Top Shot Score, different scale)
- Encapsulation discussion (PSA "slabs" cards; Top Shot moments are digital — no physical analog)
- "Eye appeal" subjective grading (PSA's qualitative element — too subjective for a data portal)
- Manual submission UI (PSA collectors submit cards for grading; Top Shot moments are automatically tracked on-chain)

---

## §8 — The wedge: what we OUTCLASS PSA

1. **Automatic registry updates** — PSA requires manual submission; Top Shot moments auto-track via on-chain ownership
2. **Real-time floor visibility** — PSA shows last-sold prices; we show LIVE floor + listings
3. **Per-parallel structure** (§P5) — PSA's grading is more granular than tiers but doesn't have a parallel concept; ours is structurally different and we surface it explicitly

---

*Vision-judge invokes this catalog for /set/[id] completion histogram + leaderboard work (in Phase B + future DEEPENING iters once owner_flow_address lands).*
