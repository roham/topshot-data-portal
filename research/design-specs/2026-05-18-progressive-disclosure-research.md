# Research — Progressive Disclosure Patterns (2026-05-18)

**Brief:** Roham's ask is "starts super clean and then hides all this power simply behind a click or behind a switch." Doctrine §P2: graphs-first, Bloomberg-tier density behind a drill. This doc surveys best-in-class moves, names the pattern taxonomy, and ships three concrete first-cut recommendations.

**TL;DR opinion:** The right primitive is a **two-layer model** — a clean "consumer face" (TS50 hero + 6-block strip) with **one global hotkey (Cmd-K)** as the keyboard-power entry, and **one per-card "Pro" switch** as the mouse-power entry. Everything else is a drawer. No tabs, no nested menus, no "Advanced..." link buried at the bottom of a panel. Pro traders are keyboard-first; first-time visitors are mouse-first; both must reach power in **one gesture**.

---

## §1 — Survey: signature moves by product

### Polymarket — *The Card → Detail Escalation*

**Signature move:** Homepage is a flat grid of market cards showing only the headline question, top-line odds, and volume. Click → dedicated market page reveals the full order book, price chart, comment thread, related-news rail, and resolution source.

**Concrete affordance:** The card itself is the affordance. No hover-expand, no inline drawer — it's a hard navigation. The card carries just enough (question + % + volume) to triage; the detail page is where the trading actually happens. No command palette. No keyboard shortcuts visible to a fresh user.

**Why it works for retail:** Mobile-tappable, zero learning curve, the card is a self-contained advertisement for the detail page.

**Lesson for TSDP:** A moment-card on the homepage should carry **headline + spark + one number** (e.g., 24h % change). The drill is a full page, not a popover. Don't try to cram a chart into a card hover — it cheapens both the card and the detail view.

---

### Stripe Dashboard — *Chrome as Camouflage*

**Signature move:** The default dashboard shows a single big number (today's volume) and a sparkline. Every panel has a small, low-contrast "View more →" or "..." menu. The complexity (webhooks, Radar rules, Connect routing, Sigma SQL) lives behind sidebar navigation that **looks** like it's just five items but unfolds into dozens.

**Concrete affordance:** Persistent left sidebar with grouping; "Developers" toggle in top-right that switches the entire chrome into API/log/webhook mode. The Developers toggle is the single most copied move in fintech — it's "regular vs. power" as a literal binary switch.

**Lesson for TSDP:** Adopt a **"Pro Mode" global toggle** in the top-right (next to wallet/connect) that swaps the entire interface from consumer-facing (cards, big charts, low density) to trader-facing (table-first, dense KPI strip, exposed numerical precision). This is the single highest-leverage move in the entire research set.

---

### Apple System Settings (post-Ventura) — *Search-First, "More Options" Buttons*

**Signature move:** Settings landed clean but lost discoverability. The recovery move is a prominent search bar at top of the sidebar, and contextual `More options...` buttons that open modal sheets with the truly advanced controls.

**Concrete affordance:** Cmd-F focuses the search; `More options...` opens a sheet (not a new page) so the user keeps context. The sheet animation is a subtle vertical slide-up — keeps the parent visible behind it.

**Lesson for TSDP:** When a card has 3+ secondary actions, hide them behind a single `⋯` icon that opens a **sheet, not a dropdown**. Sheets preserve context; dropdowns feel like menus.

**Anti-lesson:** Apple's search-first approach is a defensive move — they made the surface so clean they hid things. Don't lean on search as the primary discovery mechanism for power features.

---

### Notion — *The Slash Menu*

**Signature move:** Type `/` anywhere → palette opens inline with every block type, integration, and command. Zero chrome on the page; the entire feature set is one keystroke away.

**Concrete affordance:** `/` is the trigger. The menu appears **at the cursor**, not as a global overlay. Arrow keys to navigate, Enter to select. Typing while it's open filters fuzzy.

**Lesson for TSDP:** A **scoped palette** triggered by `/` inside a card or chart context (e.g., `/` while a chart is focused → list of indicators, time ranges, comparison overlays). Different from Cmd-K, which is global navigation. Slash is local action.

---

### Linear — *Cmd-K as Universal Verb*

**Signature move:** The default app is minimal — three columns, sparse type, no visible toolbar. Cmd-K opens a global palette that does **everything**: create issue, navigate, change status, assign, filter, switch workspace. Power users almost never touch the mouse.

**Concrete affordance:** Cmd-K opens a centered modal palette with fuzzy search across actions + entities. Recent actions surface first. Each command supports sub-actions (e.g., "Assign issue → [user picker]" is a two-stage flow inside the palette).

**Lesson for TSDP:** This is **the** answer to "what's the keyboard-first power affordance." Cmd-K should:
- Jump to any player / set / moment / collector
- Run a screen ("Show me Cosmic Curry under $50 with serial < 100")
- Toggle Pro Mode
- Open the indicator drawer
- Export current view as CSV

The palette is the URL bar of the app.

---

### Arc Browser — *Collapse-to-Glance*

**Signature move:** Sidebar can be fully collapsed with a single keystroke (Cmd-S), leaving only the page content. Toggles for split view, picture-in-picture, peek tabs are surfaced as small icons that animate in only on hover.

**Concrete affordance:** Cmd-S collapses; hover-near-edge reveals the sidebar in a translucent overlay (doesn't push content). The reveal is a quick fade+slide.

**Lesson for TSDP:** **Hover-edge reveal** for the left navigation. The portal should be able to run full-bleed (chart fills the viewport) with the nav slipping out of the way and returning on mouse-near-edge or hotkey.

---

### Raycast / Alfred — *Single Input, Infinite Power*

**Signature move:** Cmd-Space (system-level) opens a 600px-wide input. Type anything. The input is everything. No homepage, no menu, no settings panel by default — there's just the input and what it returns.

**Concrete affordance:** Pure keyboard. Modal extensions (Linear, GitHub, Stripe) are surfaced as inline commands. Tab drills deeper without closing.

**Lesson for TSDP:** The extreme version of Linear's Cmd-K. Probably **too far** for TSDP — visual context (charts, leaderboards) is half the value, and Raycast/Alfred sacrifice all visual context for keyboard primacy. Take the input model, keep the visual.

---

### Bloomberg Terminal — *Max Density Default* (anti-anchor)

**Signature move:** Eight panels visible at all times. Every pixel has a number. Function codes (`PX1`, `SECF`, `MSGE GO`) are typed into a persistent command line and route to monitors. No hierarchy — everything is peer.

**Concrete affordance:** The amber-on-black command line at the top of every monitor. Type a ticker + function code + GO. No nesting, no menus, no progressive anything. Every keystroke is global.

**Why pros tolerate it:** Latency. They will not give up one millisecond of cognitive bandwidth for aesthetics. Information is more valuable than information design.

**Lesson for TSDP:** Bloomberg is the **destination state, not the default state**. The Pro Mode toggle should reveal Bloomberg-tier density (multi-panel, exposed precision, keyboard verbs) but should never be the first thing a fresh visitor sees. **Do not copy the visual aesthetic** — TSDP's audience overlaps with Bloomberg but skews younger, mobile-aware, and design-literate. Amber-on-black says "1985 dinosaur." Use density + monochrome + sharp typography to say "2026 quant desk" instead.

---

### TradingView — *Drawer-Based Indicator Library*

**Signature move:** Default chart is clean — price, time axis, one volume row. Indicators live behind a **single toolbar button** (the `fx` icon) that opens a searchable drawer with hundreds of indicators. Selected indicators stack on the chart; each gets a small inline settings icon.

**Concrete affordance:** Toolbar button opens a left-side modal drawer (not full-screen). Search-first inside the drawer. Recently used and favorites pinned at top. Click-to-add, the drawer stays open so users can stack multiple indicators in one session.

**Lesson for TSDP:** This is the **gold standard for chart power-features**. Adopt directly:
- A small `fx` (or `+ overlay`) button on every chart
- Opens a left-side drawer (sheet width, not full-screen)
- Search-first list of overlays: floor-price-of-comparable-set, volume-weighted-avg, owner-count, serial-rarity-curve
- Click adds; drawer stays open for stacking

---

### VSCode — *Minimal Editor, Palette Reveals Everything*

**Signature move:** Default editor is just the file pane. Cmd-Shift-P opens command palette with every command, theme, extension setting. Cmd-P is fuzzy file finder. Two palettes, scoped — one for *commands*, one for *navigation*.

**Concrete affordance:** Cmd-P = "where do I go." Cmd-Shift-P = "what do I do." The scoping is the cleverness — users learn one of them first, and the modifier-shift teaches them the second exists.

**Lesson for TSDP:** Steal the dual-palette model:
- **Cmd-K** = navigation (jump to player/moment/set/collector)
- **Cmd-Shift-K** = actions (toggle Pro Mode, export CSV, change time range, add overlay)

This gives keyboard-power users a clean mental model: K is "go," Shift-K is "do."

---

## §2 — Pattern taxonomy

Five distinct progressive-disclosure primitives observed. Each has a place; mixing them sloppily creates the "every product looks the same" feeling.

| Primitive | Trigger | Best for | Examples |
|---|---|---|---|
| **Hard navigation** | Click a card / row | High-context destination (a full market, a full player profile) | Polymarket, Linear issue page |
| **Side drawer** | Toolbar button | Stackable additions to a persistent canvas (indicators on a chart) | TradingView, Figma layers |
| **Sheet / modal** | `⋯` menu or `More options...` button | Secondary configuration that needs the parent visible | Apple Settings, Stripe edit-flows |
| **Command palette** | Cmd-K (global) or `/` (local) | Power users; verbs and navigation; fuzzy search | Linear, Notion, VSCode, Raycast |
| **Global mode toggle** | Switch in top chrome | Binary "consumer ↔ pro" reframing of the entire interface | Stripe Developers toggle, Arc sidebar-collapse, GitHub dark mode |

**The big insight:** These are not interchangeable. A drawer is for *stacking onto a canvas*. A sheet is for *editing without losing context*. A palette is for *verbs and jumps*. A mode toggle is for *changing the meaning of the surface itself*. Pick the right primitive for each disclosure, don't default to dropdowns.

---

## §3 — Recommendations for the Top Shot Data Portal

### 3.1 — Default homepage (fresh visitor)

**Keep:** TS50 hero + 6-block strip. This is **the right amount of density** for a landing surface — it tells a story (the market index) and offers six entry points without forcing a choice. Polymarket's homepage is denser than this and still feels clean; we're well within the budget.

**Add:** A small, persistent `Pro Mode` switch in the top-right chrome (Stripe Developers pattern). Default OFF. When ON: the 6-block strip expands to a 12-block grid with exposed precision (decimals, raw vol, %∆ on 1d/7d/30d).

**Add:** Cmd-K hint in the top chrome — a faint `⌘K` glyph in the search affordance. Power users will instinctively try it; consumers will ignore it.

**Cut:** Nothing yet. The current homepage isn't over-stuffed.

### 3.2 — Drawer inventory (what lives behind one click)

| Surface | Drawer trigger | Drawer contents |
|---|---|---|
| Any chart | `+ overlay` button (top-right of chart) | Indicator library: comp-set floor, VWAP, owner-count, serial-rarity curve, listing depth — TradingView pattern |
| Player profile | `Pro` toggle (per-card local) | Full KPI table: market-cap series, serial distribution, top-30 holder concentration, recent-trade tape |
| Moment card | Card click → full page (Polymarket pattern) | Order-book equivalent: full listing depth, sale history, holder list, comparable moments |
| Global nav | Cmd-K | Universal jump — player, moment, set, collector, screen |
| Any column header | Click | Sort + filter sheet (NOT a dropdown — sheet preserves context) |

### 3.3 — The single primary affordance

**Two affordances, scoped clearly. Don't try to pick one.**

1. **Mouse-power: per-card `Pro` switch** — a small toggle in the top-right of any card that swaps that card's visualization from "consumer view" (one chart + one number) to "pro view" (dense KPI table + sparkline + raw precision). This is the *per-component* version of Stripe's global Developers toggle. Local in scope so a user can have one card in Pro and another in consumer view, A/B'ing the disclosure.

2. **Keyboard-power: Cmd-K palette** — global navigation + verbs. Same scope as Linear. This is the URL bar of the app.

A **global Pro Mode toggle** in the chrome flips every card's default to Pro at once. Useful for returning power users.

### 3.4 — Gesture vocabulary

Pro Top Shot traders are a **hybrid** audience — younger and more design-literate than Bloomberg pros, but with the same impatience for clicks-to-information. Calibration:

- **Keyboard-first available, mouse-first default.** Bloomberg-style "you must learn function codes" loses 80% of the audience. But Cmd-K + 1–2 letter shortcuts (J/K for next/prev row, / for slash menu, Esc to close) is table stakes.
- **No hover-to-reveal** for critical info. Polymarket gets away with this only because the cards are simple. TSDP charts are too information-rich for hover-driven disclosure — touch users get nothing, and lazy mice miss it.
- **Mobile: tap-to-drill, no Pro Mode.** Pro Mode is desktop-only. On mobile, simplify aggressively — the card *is* the surface, and the detail page is the drill.

### 3.5 — Animation grammar

- **Sheets:** slide-up from bottom-right (Apple pattern). 180ms, ease-out. Parent dims to 70% opacity.
- **Drawers:** slide-in from left edge. 220ms, spring (not ease). Parent stays at full opacity — drawers add to the canvas, they don't replace it.
- **Hard nav (card → detail page):** no animation. Pretending a navigation is a "morph" wastes 400ms of trader time. Just go.
- **Pro Mode toggle:** the card's contents cross-fade (120ms) and the card itself resizes with a quick spring (180ms). No flash, no pulse. Pro users hate UI theatre.
- **Cmd-K:** centered modal, fade-in only (100ms). No scale, no slide. Speed matters more than delight.

---

## §4 — What to NOT copy

### From Bloomberg Terminal
- **Amber-on-black aesthetic.** Signals "legacy enterprise software." TSDP audience associates this with their boomer uncle's E*Trade, not professional tooling.
- **Function-code as primary verb.** `PX1 GO` is fast for Bloomberg natives but actively hostile to onboarding. Cmd-K + fuzzy search is strictly superior — same speed, zero learning curve.
- **Eight panels visible always.** Cognitive load is real. Pros tolerate it at Bloomberg because they have no alternative; offer them an alternative and most will take it.
- **No information hierarchy.** Bloomberg treats every number as equal. TSDP should *opine* — the TS50 hero is bigger than the 6-block strip for a reason. Hierarchy is editorial; don't abdicate it.

### From overly-busy dashboards generally
- **Tabbed sub-navigation inside cards.** Tabs are a UX cope for "we don't know what's primary." If a card has tabs, the card is doing too much — split it or use Pro Mode.
- **"Advanced..." links at the bottom of panels.** Apple's defensive move. Power users don't read down to the bottom of panels; they expect a toggle at the top.
- **Persistent right-rail "details" panel.** Always-visible details panels burn 25% of viewport for content that's irrelevant 90% of the time. Use a drawer that opens on demand.
- **Density via tiny type.** Bloomberg uses 10pt because they have no choice. We can use 13pt and exposed precision without going tiny. Don't shrink to fake density.
- **Hover-tooltips as primary information.** Touch users get nothing; lazy users miss it. Tooltips are for *labels*, not *content*.

---

## §5 — Three concrete first-ship recommendations

### Ship 1: Global Cmd-K palette (the URL bar of the app)

**What:** Cmd-K opens a centered modal palette, 600px wide. Fuzzy search across:
- Players (e.g., "lebron" → top match navigates to LeBron profile)
- Moments (e.g., "curry cosmic" → list of Curry Cosmic moments by set)
- Sets (e.g., "metallic gold" → set page)
- Collectors (handle / wallet address)
- Screens (saved filters)
- Actions (toggle Pro Mode, export CSV, open indicator drawer)

**Where:** Globally available. Hint glyph (`⌘K`) in top chrome.

**Why first:** Highest-leverage single addition. Linear-class navigation immediately. Sets the keyboard expectation for every other shortcut.

**Implementation note:** Use `cmdk` (the React library by pacocoursey/Vercel team) — it's the de facto standard, ~5KB, handles all the fuzzy-search + keyboard nav correctly. Don't roll your own.

---

### Ship 2: Per-card `Pro` toggle on the 6-block strip

**What:** Each of the 6 hero blocks gets a small toggle in its top-right corner. OFF (default) shows the current consumer view: one chart, one big number. ON swaps to: dense KPI table (5–7 numbers), sparkline, exposed precision (4 decimals on prices, raw integer volumes), and one inline action button (`Expand →` for full page).

**Where:** All 6 blocks on the homepage strip. Same pattern on player and set pages.

**Why second:** Lets a fresh visitor see the homepage at consumer density (which is the current state) while letting a returning pro flip individual cards to dense mode without leaving the page. It's the per-component version of Stripe Developers — same psychology, more granular.

**Implementation note:** Persist toggle state in localStorage per-card. Returning users see their previous configuration. Also wire a `Pro Mode` master toggle in chrome that flips all cards at once (overrides individual states until toggled off).

---

### Ship 3: TradingView-pattern overlay drawer on any chart

**What:** Every chart gets a small `+ overlay` button (top-right of chart). Click opens a left-side drawer (320px wide) with:
- Search input at top
- Categorized list: Price overlays (VWAP, comp-set floor), Volume overlays (listing depth, sales velocity), Ownership overlays (holder count, top-30 concentration), Rarity overlays (serial distribution, jersey-match indicator)
- Click an overlay → adds to chart, drawer stays open for stacking
- Each added overlay shows as a chip below the chart with a small `⋯` for settings or remove

**Where:** Every chart in the portal. Start with the TS50 hero chart, then the per-player price chart, then the per-set chart.

**Why third:** Delivers the "Bloomberg-tier density on drill" promise without restructuring the page. Most progressive disclosure happens *inside the chart*, which is where pro traders spend their time. Also: this is the move that most clearly differentiates TSDP from Top Shot's existing native UI.

**Implementation note:** Drawer is a `<aside>` that slides in from the left edge of the chart container (not the full viewport). Use `framer-motion` with a 220ms spring. Persist the user's selected overlays per-chart-type in localStorage.

---

## Final calibration

The reason this all works is **scope discipline.** One global keyboard primitive (Cmd-K). One global mouse primitive (Pro Mode toggle in chrome, and its per-card local version). One canvas-extension primitive (the chart overlay drawer). One drill primitive (card → full page, hard nav).

Four primitives. Nothing else. No tabs, no nested menus, no "Advanced..." links, no right-rail panels, no hover-to-reveal for critical content.

When in doubt: **the homepage should look like Polymarket. The chart should behave like TradingView. The keyboard should feel like Linear. The mode-switch should work like Stripe.** Don't invent a fifth pattern.
