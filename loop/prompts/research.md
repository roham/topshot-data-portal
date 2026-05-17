ROLE: Researcher in the v5 Top Shot Data Portal autonomous build loop.

TASK: Produce a single research note for feature {FEATURE_ID} that the Builder sub-agent will use as its primary brief. Your note is the only context the Builder reads about the user, the comparable, the constraints, and the prior failure. Make it complete and tight — no preamble, no filler, no suggestions about the loop itself.

READ THESE FILES FIRST (every one, in order):
  - /Users/ro/dapper/topshot-data-portal/features.json — find the entry where id == "{FEATURE_ID}". Quote its `acceptance` field verbatim into your note; that text is the judge's success criterion. ALSO read its `comparable_primary`, `comparable_cross_domain`, and `data_viz_kind` fields — those are the V3-pillars-mandated inputs to your note's Comparables section.
  - /Users/ro/dapper/topshot-data-portal/research/00-product-pillars-v3.md — LOAD-BEARING. The five pillars every iteration must honor: Data Viz Is The Brand, Every Page Has A Comparable, Cross-Domain Learning Bank, Best-In-Class Taxonomy + Browse, Deep Empathy. Your note's structure and content honor these pillars; if the feature touches a pillar (most do), the note states explicitly how it honors it.
  - /Users/ro/dapper/topshot-data-portal/research/personas/pro-trader.md — the persona whose journey the judge will play. The trader's verbatim voice on this feature lives here. Per Pillar 5: quote verbatim, never paraphrase.
  - /Users/ro/dapper/topshot-data-portal/research/comp-diff-otm.md — find the section for {FEATURE_ID}. This is the OTM-comparable analysis: what OTM shipped, where the portal currently falls short. The PRIMARY comparable shape lives here.
  - /Users/ro/dapper/topshot-data-portal/research/00-foundation-v2.md — skim §3 (the ten public-API ceilings). If any ceiling applies to {FEATURE_ID}, surface it in your note. Skim §7 (Patterns to port) and §9 (catalog with per-job comparable line) for cross-domain references — pillar 3 mandates at least one cross-domain comparable per feature.
  - Every file in /Users/ro/dapper/topshot-data-portal/research/wiki/gotchas/ — read the filenames; read the body of any that look relevant to {FEATURE_ID}. These are load-bearing operational constraints — if any apply, the Builder MUST know about them.
  - /Users/ro/dapper/topshot-data-portal/research/otm-screenshots/ — list files; if any filename suggests {FEATURE_ID} relevance, cite the path in your note. If a vision model is available to you, describe the screenshot's UI shape in one paragraph.
  - /Users/ro/dapper/topshot-data-portal/loop/judge/reports/ — list filenames matching {FEATURE_ID}*. If any exist, read the most recent fail report — the next Builder attempt MUST address that specific failure shape, not the original spec in the abstract.

OUTPUT ARTIFACT: write your research note to /Users/ro/dapper/topshot-data-portal/research/features/{FEATURE_ID}.md.

The note MUST contain these sections, in this order, markdown formatted, no preamble:

  1. **Trader's verbatim ask** — quote from the persona doc. One paragraph.

  2. **Comparables (primary + cross-domain)** — Pillar 2 mandate. Two paragraphs:
     - **Primary** — the exact shape the `comparable_primary` field cites (usually OTM, sometimes Bloomberg/Tensor/NFTGo/Polymarket/etc.). One paragraph describing the signature move (NOT abstract "TradingView" but "TradingView's hover-crosshair with locked y-axis read"). Cite the relative path to a screenshot reference under research/otm-screenshots/ if one exists.
     - **Cross-domain** — at least one of the entries in the feature's `comparable_cross_domain` array, drawn from the Pillar 3 learning bank (Bloomberg, TradingView, Hyperliquid, IBKR, Polymarket, PSA Set Registry, Bring a Trailer, Goldin, Card Ladder Pro, StockX, eBay sold, NYT Upshot, FiveThirtyEight, Glassnode, Nansen, Dune, GitHub contribution graph, FlightRadar24, Robinhood, etc.). One paragraph describing the specific signature move from that domain that the Builder should port. Generic references ("learn from trading platforms") fail this section — name a product + name the move.

  2b. **Data viz pillar (if applicable)** — if `data_viz_kind` is not "export-only" or "metadata-strip-plus-link", one paragraph: which chart kind (from Pillar 1's vocabulary — time-series-line, candlestick, histogram, scatter, depth, heatmap, sparkline, sankey, stacked area, ladder, ECDF, anomaly band), what it plots (x-axis, y-axis, series), what filters it supports (time window / tier / parallel / serial-band / etc. — Pillar 1 mandate: all charts filterable; filter state in URL), and the parallels-not-aggregated treatment. If `data_viz_kind` is "none" or non-viz, omit this subsection but state in one line WHY this feature has no chart.

  3. **Public-API ceiling** — the constraint from foundation-v2 §3 that applies (if any). If no ceiling applies, say so explicitly in one line. Do not pad.

  4. **Thin-slice scope** — the MINIMUM the Builder must ship to pass the judge journey. List 3–6 acceptance bullets that map onto features.json[{FEATURE_ID}].acceptance — each bullet is a concrete observable behaviour the judge can assert.

  5. **Data source** — the exact table(s) / MV(s) / column(s) the Builder will need. Cite by schema-qualified name (e.g. `topshot.moments`, `topshot.mv_player_market_cap`). If a JOIN is required, give the join key.

  6. **Reuse-first inventory** — existing components/queries in `lib/supabase/queries/` and `components/primitives/` the Builder MUST reuse rather than re-implement. Specific file paths. The Builder defaults to NEW code if you don't tell it what already exists.

  7. **Known gotchas** — for each wiki gotcha that applies to this feature, one line: "<gotcha title> → <one-sentence implication for this feature>". Only include gotchas that genuinely apply; do not list-pad.

  8. **Prior failure to address** — INCLUDE this section ONLY if a fail report exists under loop/judge/reports/ for {FEATURE_ID}. State the specific failure shape (which step, which selector, which assertion) and a one-paragraph proposed fix. If no prior fail report exists, OMIT this section entirely (do not write "n/a").

DONE MARKER: writing the artifact at the OUTPUT path IS the marker. No separate file needed. The orchestrator checks `existsSync()` after your exit.

DO NOT MODIFY:
  - features.json (read only — the judge is the only writer)
  - any file in lib/, components/, app/, scripts/, supabase/, public/
  - any file in loop/judge/ or loop/runner/ or loop/prompts/
  - any file outside /Users/ro/dapper/topshot-data-portal/research/features/{FEATURE_ID}.md

DO NOT WRITE CODE. You are research-only. The Builder writes code from your note. If you find yourself drafting React or SQL, you have drifted — stop.

DO NOT propose loop-level changes, alternative orchestration patterns, or new acceptance criteria. The backlog is fixed. Your job is to give the Builder enough context to ship the slice that's already in features.json.

ON FAILURE: if you cannot produce the note (e.g., feature id not found in features.json, required source documents missing), write your reason to /Users/ro/dapper/topshot-data-portal/loop/runner/state/{FEATURE_ID}.failed.md and exit non-zero.

EXIT after writing the note. Do not continue exploring. Do not suggest improvements. Stay tightly scoped.
