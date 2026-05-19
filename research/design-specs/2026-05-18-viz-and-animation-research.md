# Research — Modern Viz Libraries + Animation Patterns (2026-05-18)

**Author:** research subagent (Opus 4.7)
**For:** Dexter — Top Shot Data Portal viz + motion direction
**Stack assumed:** Next.js 15 App Router, RSC, Tailwind CSS, currently Recharts.
**Doctrine load:** §0 + P1–P9 from `research/doctrine.md`. Especially P2 (graphs first), P4 (charts are substance not decoration), P9 (start with market cap, earn breadth).

The opinionated thesis up front: **stay on Recharts for cards-grid sparklines and bar charts; graduate to visx for the hero TradingView-style time-series chart and depth-ladder; add ECharts only if and when we ship treemap + sankey + parallel-coordinates for the drill-downs. Use framer-motion for everything that moves. Anchor the aesthetic to TradingView, not Linear.** Reasoning below.

---

## §1 — Viz library landscape

### The table

| Library | Bundle (gz) | Ceiling | Time-to-decent | Good at | Bad at | Reach for it when |
|---|---|---|---|---|---|---|
| **Recharts** (current) | ~95 KB | Low–Mid | Hours | Declarative React, sparklines, simple bar/line/area, sensible defaults | Custom crosshair, multi-axis composition, depth ladders, perf at >5k points, no native zoom/brush worth shipping | You need a sparkline in a card. Period. |
| **visx** (Airbnb) | ~30–60 KB (per-module) | Very high | Days | d3 primitives in React idiom; tree-shakeable; XYChart for fast standard charts; full control on crosshair / tooltip / brush | You write more code; not "drop-in"; docs are sparse for advanced patterns | TradingView-style hero chart, custom hover behavior, depth ladders, multi-axis financial charts. |
| **Observable Plot** | ~60 KB | High | Hours | Grammar-of-graphics, terse, beautiful defaults, Mike Bostock's lineage | Not React-native (DOM-render handoff is awkward in RSC); annotations are great but interactions are weak | Static-ish analytical charts for NYT-Upshot style storytelling pages. NOT for the hero. |
| **deck.gl** | ~200 KB+ | Very high | Days | Millions of points, GPU, geospatial, hexbin | Overkill for our cardinality (~$10k moments × ~200 sets); WebGL is a separate mental model | Not yet. Maybe a "collector geography" surface in year-2. |
| **ECharts** (echarts-for-react) | ~200 KB | Very high | Hours | Treemap, sankey, parallel-coordinates, heatmap, candlestick — full enterprise menu; great built-in interactions | Heavy; not React-idiomatic (config-object); imperative escape hatches are clumsy | The treemap of "market cap by team" and the sankey of "supply flow set→tier→parallel." Drill-down surfaces only. |
| **Vega-Lite** | ~250 KB | High | Hours | Declarative JSON grammar; great for analyst-authored charts | JSON-as-API fights TypeScript ergonomics; perf hit; the React wrapper is a thin shim | Not recommended — Plot is better for the same niche and lighter. |
| **Tremor** | ~30 KB on top of Recharts | Low | Minutes | Tailwind-shaped chart cards out of the box | It IS Recharts under the hood — same ceiling. Aesthetic is shadcn-flavored. Risk: looks like every other AI-startup dashboard | If we want fast scaffolding for an internal admin view. Skip for the customer-facing portal. |
| **nivo** | ~100 KB+ per chart type | Mid | Hours | Big chart catalog, animations built in, theming hooks | Heavy per chart; animations look "designed-in-2019"; SSR support is fiddly | Skip. ECharts beats it on breadth, visx beats it on ceiling. |
| **plotly.js** | ~1 MB | High | Hours | Scientific charts, 3D | The 1 MB is disqualifying for a consumer surface | Skip for portal. Fine for internal Jupyter-style tools. |
| **D3 raw** | ~70 KB | Infinite | Days | Anything you can imagine | Hand-rolling axes, ticks, transitions, a11y; you become the maintainer of every regression | Only inside a visx layer when visx doesn't have the primitive. Never as a top-level choice. |

### Concrete recommendation — staged

**Stage 0 — TODAY (keep, don't migrate):**
Recharts continues to power: sparkline cells inside cards, the small mover-bars at the top of the homepage, the bar chart of "30D % movers," any chart that is incidental decoration on a card. **Switching cost is not justified for these.** Recharts is fine when the chart is a thumbnail.

**Stage 1 — NEXT (introduce visx for ONE chart):**
Migrate the **hero "Top players by market cap (time-series)" chart** to visx. This is the load-bearing P9 chart and it needs: hover crosshair with locked y-axis read (TradingView signature), multi-line with hover-highlight, time-window pills, brush, and 200ms transitions. Recharts cannot deliver the crosshair-feel without ugly workarounds. visx delivers it cleanly. Ship this single chart on the hero; learn the primitives; reuse.

**Stage 2 — DRILL-DOWN ECONOMICS (introduce ECharts for two charts):**
When we ship the second-click drill-downs that need **treemap (market cap by team)** and **sankey (supply flow set → tier → parallel)**, those are ECharts. visx can do treemap but the built-in transitions in ECharts are better than what we'd write. Bound the ECharts footprint by lazy-importing only the charts we use (`echarts/core` + chart modules) — do not import the bundle.

**Stage 3 — STORYTELLING (introduce Plot for annotated pages):**
If/when we build an NYT-Upshot-style annotated long-form chart page (e.g., "what happened to Series 1 floor over 2024"), Observable Plot is the right tool. Render server-side in a Server Component to static SVG; no JS for the static surface; layer in scroll-driven framer-motion annotations on the client. Don't introduce until we have a real story to tell.

**Reject for now:** deck.gl (no need at our cardinality), plotly (bundle disqualifying), nivo (no advantage over ECharts/visx), Vega-Lite (Plot is better for the same niche), Tremor (locks us into Recharts' ceiling under a different wrapper).

**The architecture rule:** ONE library per chart-class. Don't render some sparklines in Recharts and others in visx. The chart-class taxonomy:
- Sparkline / mini-bar / mini-line → Recharts
- Hero time-series with crosshair → visx
- Depth ladder / order-book-shape → visx
- Treemap / sankey / parallel-coordinates → ECharts
- Annotated scrollytelling → Plot

---

## §2 — Animation libraries

### The table

| Library | Bundle (gz) | Mental model | Good at | Bad at |
|---|---|---|---|---|
| **framer-motion** | ~50 KB | Declarative React `<motion.div>` props | Layout animations (`layout` prop), AnimatePresence enter/exit, gestures, shared-layout transitions, drag, variants | Imperative timelines (use GSAP); heavy compared to CSS for trivial cases |
| **react-spring** | ~30 KB | Physics-based springs; hook API | Natural-feeling motion, parallax, list re-orderings | Steeper API; less popular than framer-motion → smaller talent/AI training pool |
| **GSAP** | ~30 KB core + plugins | Imperative timeline, jQuery-feel | Sequenced reveals, SVG path morphs, ScrollTrigger; the 800 lb gorilla for marketing pages | Not React-idiomatic; you fight reconciliation; licensing for ScrollTrigger free since 2024 (GreenSock joined Webflow) |
| **Lottie** (lottie-react) | ~60 KB | Plays AfterEffects JSON | Designer-authored loading states, empty-state characters, hero illustrations | Requires AE workflow; payload size; the "Lottie aesthetic" reads instantly as 2021 startup |
| **Auto-Animate** (formkit) | ~3 KB | One-line `useAutoAnimate` ref | Free list re-order animations, accordion-style reveals | Limited; no control over easing curves; can't do anything custom |
| **CSS view-transitions API** | 0 KB (native) | Browser-driven cross-document/SPA morph | Page-to-page crossfades and shared-element transitions; the future-state default | Chrome-only for cross-document until 2025–26; same-document support is broader; Next.js App Router integration is still experimental |

### Concrete recommendations per use case

| Use case | Pick | Why |
|---|---|---|
| Chart transitions when toggling time-window (30D → 90D → 1Y) | **framer-motion** + visx animated path | `<motion.path>` with `animate` on the `d` attribute, ~300ms, ease-out. visx exposes scales so we interpolate domain not pixels. |
| Sparkline updates on new data (polled) | **framer-motion** on the SVG path with `transition={{ duration: 0.6, ease: "easeInOut" }}` | Cheap, declarative, matches TradingView's "tick draws in" feel. |
| Tooltip reveal on hover | **framer-motion** AnimatePresence with `initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}` over 120ms | Sub-200ms = Bloomberg-feel. Don't spring; ease-out. |
| Drawer slides (filter rail, detail panel) | **framer-motion** AnimatePresence, x-translate 280ms cubic-bezier `[0.32, 0.72, 0, 1]` (Linear's curve) | The Linear curve is the right answer; everyone copies it. |
| Page-to-page crossfade | **CSS view-transitions** with framer-motion fallback | Ship view-transitions for capable browsers; the fallback is a 150ms opacity transition. Don't over-engineer. |
| Hover state morph on cards (lift + shadow + chart-line highlight) | **framer-motion** layout + `whileHover` | The `layout` prop handles the lift; child path stroke-width animates via prop. |
| Number ticker (price counting up/down) | **framer-motion** `useMotionValue` + `useTransform` with `Intl.NumberFormat` | The Polymarket "62% ↗" feel — short 400ms count-up on update, color flash to green/red. |
| Empty-state illustration | **none — static SVG** | Lottie is a trap here. Static SVG with a 1-line framer-motion `animate={{ opacity: [0.6, 1, 0.6] }}` pulse is enough and 100x lighter. |
| Loading skeletons | **CSS shimmer** (Tailwind `animate-pulse` or hand-rolled keyframe) | No JS for skeletons. Ever. |

**One library to ship: framer-motion.** It covers ~90% of what we need; CSS handles the rest. Skip GSAP unless we build a marketing landing page that does scrollytelling, and even then framer-motion's `useScroll` covers most of it. Skip react-spring — it's framer-motion's sibling and we don't need both.

---

## §3 — Signature moves per comparable

For each, the named single move precisely, then the port-to-our-stack note.

### Polymarket — the market card hover + the "ticker tick"

**Signature move (card hover):** On hover of a market card in the cards-grid, the card lifts ~2px with a subtle shadow expansion (~150ms), the embedded probability chart's line stroke-width animates from 1.5px to 2px, and a faint vertical guide line appears at the cursor x-position. The probability percentage in the corner does not animate position but its color shifts slightly toward fully-saturated. Cursor leaves → reverse.

**Signature move (price tick):** When a probability updates (websocket), the new percentage number does a 400ms count-up tween from old to new value, and the chart line extends rightward by one segment with a 600ms ease-out draw. A 1-second green/red flash on the cell border indicates direction.

**Port:** `<motion.div whileHover={{ y: -2, boxShadow: "..." }} transition={{ duration: 0.15 }}>` around each card. Inside, the visx-or-Recharts `<path>` is a `<motion.path>` with `whileHover` on the parent driving stroke-width via variants. For the tick, `useMotionValue` for the percentage + `useTransform` to a formatted string, fed by the SWR cache.

### Card Ladder Pro — CL50 time-window pills + crosshair

**Signature move:** Time-window pills (`24H | 7D | 30D | 90D | 1Y | ALL`) live above the chart. Click a pill: the active pill background slides (shared-layout transition) from the previous pill to the new pill in ~200ms, NOT a fade. The chart's y-axis domain animates to the new range over ~400ms. The line redraws by interpolating the d-attribute, never by snapping. Crosshair on hover: thin vertical line + dot on the line + a fixed-position read-out in the top-right corner showing date + value (NOT a floating tooltip near the cursor).

**Port:** Use framer-motion's `layoutId` on the active-pill background — this is THE killer use of the `layoutId` prop. visx for the chart; animate the d-attribute via `motion.path`. Crosshair is plain visx `<Bar>` over the chart catching mousemove + a fixed read-out element absolutely positioned outside the chart frame.

### TradingView — hover crosshair with locked y-axis read

**Signature move:** Crosshair has a vertical line and a horizontal line. The horizontal line's intersection with the y-axis renders a small label-block (filled rectangle, white text) showing the exact value at cursor height — even when the cursor is between data points (the value reads the y-pixel, not the nearest datum). On the x-axis, a similar label shows the date at the cursor x. Sub-50ms response time — no animation, just instant follow.

**Port:** visx `<Bar>` catching mouse, two `<Line>` elements for crosshair, two `<Group>` with `<Rect>` + `<Text>` for axis labels. No motion library — animation here is wrong; the user wants instant reading. This is the load-bearing TradingView feel.

### Bloomberg Terminal — sub-200ms panel transitions, function-code reveal

**Signature move:** Type a function code (`MSFT US Equity GP <GO>`) — the panel that appears does so in under 200ms with NO fade. Hard cut. The data fills in cell-by-cell over the following ~400ms in a top-left-to-bottom-right cascade as data resolves.

**Port:** Don't fade page transitions for the data portal. Use view-transitions API with a near-zero duration crossfade for navigation. For cell-by-cell reveal, framer-motion `staggerChildren: 0.02` on a grid container with each cell as `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>`. Use sparingly — only on initial load of a dense panel.

### Tensor — depth ladder hover + listing-grid

**Signature move (depth ladder):** Vertical bid/ask depth chart. On hover, the bar at cursor-height shows a thin highlight border + an inline overlay reads cumulative quantity and price. Bars themselves have a gradient fill — opacity intensifies toward the spread. Animations on listing changes are instant — no morph.

**Port:** visx `<BarStack>` with vertical orientation, custom hover via `<Bar>` overlay catching mouse. Gradient via `<LinearGradient>` from visx. No framer-motion needed — like TradingView's crosshair, this surface wants information density, not motion.

**Signature move (listing-grid hover):** Cards in the grid lift + the rarity-rank chip in the corner pulses. Image inside the card does a subtle Ken Burns scale 1.0 → 1.03 over 300ms.

**Port:** `<motion.div whileHover={{ scale: 1.0 }}>` wrapping the image with the image itself as `<motion.img whileHover={{ scale: 1.03 }}>`. Chip pulse via `animate={{ scale: [1, 1.05, 1] }}` on a 1.5s loop while hovered.

### NYT Upshot — scrollytelling annotated charts

**Signature move:** As you scroll, annotations (a callout box with an arrow pointing at a data point) fade in at specific scroll depths. The chart itself doesn't redraw — annotations layer on. Sometimes a specific data range highlights (rest of line dims to 30% opacity).

**Port:** framer-motion `useScroll` + `useTransform` mapping scroll position to opacity. The chart is an Observable Plot or visx SVG; annotations are `<motion.g>` siblings positioned in chart coordinates. This is the right shape for a "year in review" surface — NOT for the dashboard hero.

### Polymarket vs. Linear — page-to-page transition shape

**Polymarket's transition:** Click market card → market detail. The card itself appears to "expand" into the detail view via a shared-layout transition; the title element stays in place, the chart grows from card-thumbnail-size to hero-size, and the rest of the detail page fades in behind it over ~350ms.

**Linear's transition:** Push-from-right of the new page over the current one with the old page dimming to 70% behind it. ~280ms with cubic-bezier `[0.32, 0.72, 0, 1]`. Crisp, never bouncy.

**Port (recommendation):** **Use Polymarket's shared-layout pattern for card → detail navigation on the hero surface**, because the chart is the load-bearing element and continuity matters per P2. framer-motion `layoutId` on the chart container connects the card thumbnail to the detail-page hero chart. **Use Linear's push-from-right for sibling-page navigation** (e.g., between detail pages of two different players in a watchlist). Two transition shapes, used in the right places.

---

## §4 — Aesthetic anchor recommendation

**Anchor: TradingView. Not Linear, not Stripe, not Polymarket.**

The defense:

1. **Audience match (decisive).** Pro Top Shot trader-collectors are gambler-collectors first, design-appreciators second. Per doctrine §0, the load-bearing comparables on the data side (TradingView, Bloomberg Terminal, Tensor, StockX) are all terminal-aesthetic, not marketing-aesthetic. Linear's clean motion is *correct for a developer collaboration tool*; it's *wrong for a chart you stare at for an hour deciding whether to sell.* TradingView shows you can have polish AND density.

2. **Density-first reads as serious.** Stripe-marketing-tier polish — generous whitespace, big type, single hero metric — reads as "this team did not have enough data to fill the page." MBL (the named ICP per doctrine §3) will read a Stripe-aesthetic portal as a toy. TradingView-aesthetic reads as a tool he'd pay for.

3. **Motion budget matches.** TradingView's motion is *parsimonious* — crosshair has zero animation (instant follow), pill switches are <250ms, panel reveals are <200ms hard cuts. This is the right motion budget for a data-first product. Linear is more animated than we need; Stripe is far more animated than we need. Polymarket's motion is close but the consumer-marketing-card hover (the 2px lift + shadow) is borrowed correctly without taking the whole aesthetic.

4. **Doctrine P4 fit.** "Charts are substance, not decoration." TradingView is the cleanest expression of this principle in the wild. Bloomberg goes further but the keyboard-driven function-code grammar is overkill for V1.

5. **The borrow list, in order:** TradingView (chart engine + crosshair + time-window pills + multi-axis composition) > Polymarket (cards-grid landing shape + card hover + shared-layout card→detail) > Bloomberg (drill-down density + sub-200ms transitions) > Linear (the cubic-bezier curve, the layout-id pill pattern, and nothing else).

**What this concretely means for color/type/spacing (the look, not just the feel):**

- **Dark mode is the default surface.** Light mode is the second-class citizen. (TradingView default, Bloomberg-original, Polymarket-default-now.)
- **Tabular numerics in monospace** for all numeric cells. Use a properly-designed grotesque-monospace pair like Inter + JetBrains Mono, or Geist + Geist Mono.
- **Green/red are the only chromatic accents** in the data layer. UI chrome stays in grays. Resist purple/teal/orange "design system" temptation.
- **Density: 13–14px for chart axes, 14–15px for data tables, 16px for prose.** Generous-Stripe-default (18px) is wrong here.
- **Borders, not shadows.** Shadows belong in marketing-tier polish. Terminal aesthetic uses thin 1px borders (`border-zinc-800` on dark) to separate panels.

---

## §5 — Three concrete first-ship recommendations

For Dexter's next session. Specific, executable, low-risk, doctrine-compliant.

### Ship 1 — The hero chart in visx with TradingView-style crosshair

**What:** On the `/` (or `/market-cap`) landing, replace whatever Recharts hero chart exists with a visx `XYChart` rendering "Top 10 players by market cap, 30D default." Hover crosshair with the locked y-axis label-block. Time-window pills above the chart with the framer-motion `layoutId` slide. Default 30D per P7.

**Why now:** This is the load-bearing P9 surface. Recharts cannot deliver the crosshair feel. Ship the hero right, learn visx, and the pattern reuses for every drill-down chart.

**Effort estimate:** 1–2 sessions. visx XYChart + visx `<Bar>` overlay for hover + 5 lines of framer-motion for pill background.

**Acceptance:** crosshair reads y-value at pixel-cursor-height (not nearest-datum); pill switch animates background slide in ~200ms; chart line interpolates on time-window change in ~400ms; sub-50ms crosshair response.

### Ship 2 — Add framer-motion + standardize on three motion primitives

**What:** Add `framer-motion` to the project. Create `components/motion/` with exactly three primitives reused everywhere:
- `<MotionCard whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>` — wraps every card in any grid
- `<MotionTickerNumber value={n} format={fmt} />` — count-up number with green/red flash on change
- `<MotionDrawer side="right" duration={0.28} curve={[0.32, 0.72, 0, 1]} />` — the Linear curve, used for filter rails and detail drawers

**Why now:** Three primitives bound the motion vocabulary; without this, every PR re-invents transition feel and the surface looks inconsistent. The three primitives cover ~80% of needed motion across the portal.

**Effort estimate:** Half a session. Each primitive is <30 lines.

**Acceptance:** every card in the homepage cards-grid uses `<MotionCard>`; every numeric cell that updates from polled data uses `<MotionTickerNumber>`; the filter rail (when it exists) uses `<MotionDrawer>`. PRs that introduce ad-hoc framer-motion outside these primitives get sent back.

### Ship 3 — Shared-layout transition from card to detail page

**What:** On the cards-grid (`/`), when a card is clicked to navigate to `/<player>` or `/<set>` detail, animate the card's chart container into the detail page's hero chart container via framer-motion `layoutId`. Wrap with the App Router `loading.tsx` so the transition feels continuous even while the detail RSC streams in.

**Why now:** This is the Polymarket signature move and it's the moment that announces "this isn't a generic dashboard." It's also the highest visible-polish-per-line-of-code intervention available — framer-motion `layoutId` does almost all the work.

**Effort estimate:** 1 session. Trick is the RSC + framer-motion interop — the layoutId source and target both need to be client components within their respective routes.

**Acceptance:** click a card on `/`; the embedded chart morphs in place and grows into the detail-page hero chart in ~350ms; the rest of the detail page fades in behind it. Works on cold navigation (no flash of unstyled detail page).

---

## Appendix — Decisions log (what we explicitly chose NOT to do)

- **Not migrating off Recharts wholesale.** Sparklines stay. Only graduate per chart-class.
- **Not adopting Tremor.** It's Recharts with a Tailwind hat. Same ceiling.
- **Not adopting nivo or plotly.** Bundle and aesthetic both wrong.
- **Not using Lottie.** Empty-state illustration via static SVG + 1-line opacity pulse is enough.
- **Not using GSAP.** framer-motion + CSS covers our budget. Reconsider only if we build a scrollytelling marketing page.
- **Not using react-spring.** Framer-motion is the React-motion winner in 2026 for our use case.
- **Not introducing deck.gl.** Cardinality doesn't justify WebGL.
- **Not animating the crosshair.** Per TradingView and Tensor — information-dense surfaces want instant feedback, not motion.
- **Not animating page-to-page navigation outside the card→detail shared-layout case.** Linear-style push-from-right is the fallback for sibling navigation; everything else is view-transitions API with a near-zero duration.

---

*End of survey. Recommend Dexter execute Ship 1 → Ship 2 → Ship 3 in that order over the next three sessions, with a doctrine-gate check after each per P3 (every feature names a specific signature move from §0).*
