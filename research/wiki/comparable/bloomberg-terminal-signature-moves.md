# Bloomberg Terminal — Signature Moves

**Captures:** NONE — Bloomberg Terminal is private subscription software; no public captures available.
**Doctrine reference:** §0.2 — drill-down density anchor. Per doctrine: *"Density on drill-down screens (80–120 data points per panel). Function-code grammar in the search bar. Keyboard-first navigation. Tabular numeric monospace. Sub-200ms transitions."*
**Status:** Text-descriptive only. Reference for /player/[id], /moment/[id], /set/[id] drill-down density.

---

## §1 — The function-code search bar

Bloomberg's signature is the function-code command line. Examples:
- `AAPL US Equity GO` — open Apple US equity profile
- `WEI GO` — World Equity Indices
- `CALL <function>` — invoke a specific function

The search bar is THE interaction primitive. Every Bloomberg user types codes, not clicks menus.

**Port — load-bearing for the portal's `/` search palette:**
- cmd+K / `/` opens a search input
- Type-ahead suggests: player names, set names, moment IDs, edition codes
- Special commands: `MCAP <player>` opens /player/[id], `SET <id>` opens /set/[id], etc.
- Function-code grammar IS the trader-vocabulary signal per doctrine §P6

**Reject:** menu-driven nav exclusively; mouse-required interactions for primary tasks.

---

## §2 — The 80-120 data points per panel density

Bloomberg panels are RELENTLESSLY dense. A single market-data panel for one stock may show:
- 12+ price metrics (bid, ask, last, high/low/open/close × multiple timeframes)
- Volume / 50d avg vol / 200d avg vol
- P/E / EPS / dividend / yield
- Beta / 52-week range
- Sector / industry comparisons
- Recent news headlines
- Earnings calendar
- Analyst ratings

All in one panel, monospace, color-coded.

**Port for /player/[id] and /moment/[id] drill-downs:**
- The KPI grid in `dashboard-02` (8 cells) is a STARTING POINT — expand to 12-15 cells for the drill-down version
- Per-cell: large monospace value + tiny uppercase label above + tiny color-coded delta below
- Multiple time-frame snapshots in the same panel (24H / 7D / 30D / 90D / 1Y deltas all visible simultaneously)

**Reject:** marketing-friendly "key stats" cards (Card Ladder's approach — fine for landing, too sparse for drill-down).

---

## §3 — Keyboard-first navigation

Bloomberg power users RARELY touch the mouse. Every action has a keyboard shortcut.

**Port — required per persona doc:**
- `/` to focus search palette (cmd+K alternative)
- `g h` to go home (Bloomberg-style two-key combo)
- `g p` for players, `g m` for moments, `g s` for sets, `g u` for current user's bag
- Arrow keys to scroll dense tables
- `Esc` to clear filters
- `?` to show shortcuts overlay

Per persona doc: *"Missing keyboard navigation. They live inside the tool; arrow keys to scroll the table, `/` to focus search, `Esc` to clear filters — these are floor, not ceiling."*

**Reject:** mouse-only filter selection; no `Esc` key behavior; modal dialogs without escape semantics.

---

## §4 — Tabular numeric monospace

Every number in Bloomberg is monospace. Decimals align. Comma-separated thousands. Color-coded ± for deltas.

**Port — already in our `tabular-nums` CSS class usage:**
- All numeric columns use `font-mono tabular-nums` (or equivalent)
- Decimals align — important for scanability
- Comma-thousands per locale
- ± color from `DIRECTION_COLOR` palette

**Reject:** proportional-font numbers; non-aligned decimals; "5,000K" abbreviations on dense surfaces (acceptable on landings, never on drill-down).

---

## §5 — Sub-200ms transitions

Bloomberg loads dense data in < 200ms because the terminal connects to a low-latency feed AND the renderer is optimized for density.

**Port — load-bearing per doctrine §P3 / §P4:**
- Server-component pages MUST render < 2.5s LCP (acceptable browser baseline; Bloomberg's < 200ms is unattainable for SSR + Vercel cold start)
- Filter changes via Link MUST repaint < 800ms (warm Vercel cache hit)
- Interactive transitions (toggle clicks, sort changes) MUST be < 200ms perceived (using suspense + skeleton states carefully — though doctrine §P8 prefers honest empty over skeletons)

**Per persona doc:** *"Slow transitions. Anything over 200ms between filter click and table update."*

**Reject:** spinner-as-default-loading (Bloomberg doesn't show spinners on common navs); long animated transitions.

---

## §6 — Multiple-panel layouts (multi-window)

Bloomberg users often have 4-6 panels open simultaneously: stock data, news, charts, watchlist, etc. The terminal is multi-window by design.

**Port — partial:**
- Our portal is a web app, not a desktop multi-window UI
- Closest analog: dense single-page layouts that pack panels into a grid (`/market-cap` is already this)
- For "watchlist" + "ticker tape" multi-panel feel: add a sticky bottom strip with rotating recent activity (DEEPENING)

**Reject:** modal-based multi-window emulation (cluttered); literal multi-window via browser windows (UX wrong).

---

## §7 — Color hierarchy: black background + green/red/yellow

Bloomberg's signature palette is BLACK background with green (positive), red (negative), yellow (warnings), white text. Specific colors:
- Black: pure #000000 (no slate)
- Green: bright positive change (#00FF00 ish)
- Red: bright negative (#FF0000 ish)
- Yellow: warnings / amber alerts

**Port — adapted to our dark-slate palette:**
- Background: slate-950 (close to black but slightly lifted)
- Positive: cyan-400 OR our `DIRECTION_COLOR.gainer_strong` (not Bloomberg's bright green)
- Negative: coral / our `DIRECTION_COLOR.loser_strong`
- Warnings: amber-400 for stale data / data-coverage limits

**Reject:** pure black background (too harsh for web; slate-950 is the equivalent); Bloomberg's brightness (eye-fatiguing on web).

---

## §8 — News + headlines integration

Bloomberg integrates news headlines per security. Side panel shows latest news on the active stock.

**Port — deferred:**
- /player/[id] could show "recent trades / activity" feed (the analog) — already in `/player/[id]` brief
- /moment/[id] could show "recent transactions of this moment" — same
- DEFER news-headline integration (no source-of-truth for Top Shot moment news)

---

## §9 — The wedge: what we OUTCLASS Bloomberg for our audience

1. **Domain-specific vocabulary** (§P6) — Bloomberg is generic-financial. We use trader-verbatim from Discord / r/nbatopshot per persona doc.
2. **Parallels-first** (§P5) — no Bloomberg analog; unique to Top Shot.
3. **Web-native shareable URLs** — Bloomberg is closed; our URLs are shareable.

---

## §10 — What we DON'T port

- Bloomberg's commodity-trading panels (no analog)
- Earnings-call audio transcripts
- Analyst rating aggregators
- BLOOMBERG-SPECIFIC license restrictions / paywall
- $24,000/year price tag

---

*Vision-judge invokes this catalog when scoring /player/[id], /moment/[id], /set/[id] drill-down density. The density bar set by Bloomberg is HIGH; matching it on web is hard but doctrine §P2 demands it on drill.*
