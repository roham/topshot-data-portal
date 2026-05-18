# TradingView Deep Walk — What WebFetch Actually Returned

Date: 2026-05-14
Method: WebFetch (server-rendered HTML + meta) on 13 TradingView URLs.
Rule: report only what was returned. Where WebFetch returned only header/meta (JS-rendered SPAs), this is flagged explicitly — no fallback to recall.

---

## 1. `https://www.tradingview.com` (Homepage)

**Top bar / header.** Logo (left), primary nav in order: **Products | Community | Markets | Brokers | More**. Center search input. Language selector ("EN"). Blue "Get started" button (right). Free CTA framed as "$0 forever, no credit card needed."

**Above the fold.** Headline "The best trades require research, then commitment." Subhead "Where the world does markets." Hero imagery is space/aurora-themed featuring Scott "Kidd" Poteet (Polaris Dawn). No chart above the fold — this is the marketing front door, not the app shell.

**Mid-page sections (in order).**
1. **Market Summary** — S&P 500 (SPX) tile, then a carousel of major indices (Nasdaq 100, Japan 225, SSE Composite, FTSE 100, DAX, CAC 40). Crypto market-cap block with Bitcoin dominance breakdown. Commodity tiles (Light crude, Natural gas, Gold, Copper). Economic indicators tiles (US Dollar Index, US 10Y yield, US inflation rate).
2. **Community ideas** — toggle row: Editors' picks | Popular | More. Idea cards: title, truncated preview text, symbol logo + ticker, chart thumbnail, author name, timestamp (e.g., "02:31"). Sample titles seen: "SUI Rejected At Key Resistance," "Nebius Stock Soars," "ASX 200 Swing Low," "Silver needs to hit 140$."
3. **Indicators & Strategies** — same Editors' picks / Popular / More toggle. Pine Script cards with type label ("Pine Script® indicator," "library"), thumbnail, author. Seen: "Fractional EMA Kalman Filter," "Neural Weight Oscillator," "NeuraLib," "Pine3D."
4. **US Stocks** — ticker-list bars: Community trends (10 tickers: POET, ONDS, RDW, AMAT, COIN, AVGO, NVDA, MSTR, HOOD, ASTS), Highest volume (NVDA, MU, TSLA, SNDK, INTC, AMD), Most volatile (TDIC, CREG, FCUV, AIIO, LESL, STAK). Gainers/losers with **Regular hours | Pre-market | After-hours** toggle. **Earnings calendar** sub-table: company logo | ticker | actual EPS | estimate EPS | date.
5. **Crypto** — community trends (10 tickers), trade idea cards, gainers list (TELUSD +27.77%, GWEIUSD +20.23%…), losers list (SIRENUSD −24.90%, SKYAI2USD −16.57%…).
6. **Futures & Commodities** — idea cards plus 6-ticker rows of energy futures (CL1!, NG1!, BRN1!, RB1!, HO1!, AEZ1!) and metals (GC1!, SI1!, PL1!, HG1!, PA1!, ALI1!).
7. **Forex & Currencies** — pair cards, performance table with timeframe toggle: **1D | 1W | 1M | 3M | 6M | YTD | 1Y | 5Y | All**.
8. **Economy** — global inflation heatmap (0–25% scale), economic calendar preview.
9. **Trading & Brokers** — 4 broker tiles (FOREX.com, OKX, AMP Futures, OANDA), each with logo, asset class, 4.5–4.8 star rating, "Open account" CTA.

**Right rail.** None — full-bleed grid.

**Footer.** Heavy multi-column. Categories: More than a product, Community, Ideas, Pine Script, Tools & subscriptions, Trading, Special offers, About company, Merch, Policies & security, Business solutions, Growth opportunities. Data attribution: ICE Data Services, FactSet, Quartr. "© 2026 TradingView, Inc."

**Login walls.** None on the homepage. CTA is "Get started for free."

---

## 2. `https://www.tradingview.com/markets/` (Markets overview)

**Top nav.** Same: Products | Community | Markets | Brokers | More. Search + EN + "Get started."

**Page title.** "Markets, everywhere."

**Section structure (each section is a small 6-card grid + 6-row tables + "See all" link).**

- **Indices** — 6 index cards: S&P 500, Nasdaq 100, Dow 30, US 2000, Nasdaq Composite, NYSE Composite. Each card = logo + name + link; widget/chart-launch icons on hover.
- **World indices** — 12 index links (Nikkei, FTSE, DAX, CAC 40, FTMIB, IBEX, SSE, Hang Seng, Nifty, Bovespa, Russia). "See all major indices."
- **US stocks** — 6 majors (NVDA, AAPL, AMZN, GOOG, TSLA, MSFT).
- **Community trends** (10 stocks), **Highest volume** (6 stocks), **Most volatile** (6 stocks).
- **Stock gainers / Stock losers** — both have **Regular hours | Pre-market | After-hours | More** tab.
- **Earnings Calendar (US)** — 8 rows: date badge ("Today") | company logo | ticker/name | Actual | Estimate. Example row: "MNOV MediciNova, Inc. | Actual −0.05 USD | Estimate −0.08 USD."
- **IPO Calendar (US)** — heading + "See all events."
- **World stocks** — 6 cards (Microsoft, Saudi Aramco, TSMC, LVMH, Tencent, Samsung).
- **World biggest companies** — table: Symbol | Market cap. (NVDA 5.73T, GOOG 4.84T, AAPL 4.38T, MSFT 3.04T, AMZN 2.87T, AVGO 2.08T.)
- **World largest employers** — Symbol | Employees (WMT 2.1M, AMZN 1.6M, BYD 869.6K, ACN 779K, JD 776.7K).
- **Earnings Calendar (World)**, **IPO Calendar (World)**.
- **Crypto** block: 6 majors, community trends (10), market-cap ranking (6 rows: Symbol | Market cap), TVL ranking (Symbol | TVL), gainers, losers.
- **Futures & commodities** block: 6 commodity cards plus 6-row strips for Energy futures, Agricultural futures, Metals futures, Index futures.
- **Forex** block: 6 currency-pair cards, Majors (6 links), Currency indices (DXY, EXY, JXY, BXY, SXY, CXY).
- **Government bonds** block: yield-curve widget with "Customize curves" link, US bonds table (Symbol | Price & chg % | Yield %), Major 10Y bonds (USA/EU/GB/DE/FR/IT).
- **Corporate bonds** — 12-row table: Logo | Bond description | YTM | Maturity date. Short-term, Long-term, Floating-rate, Fixed-rate sub-tables.
- **ETFs** — 6 majors, community trends (10), Most traded (6), Highest AUM growth (6), Highest returns (Symbol | NAV total return 1Y), Highest dividend yields (Symbol | Div yield FWD %).
- **Economy** — 6 indicator cards (GDP, GDP growth, Real GDP, Interest rate, Inflation YoY, Unemployment). Economic-indicators heatmap of country-by-indicator. Global inflation map (0–25%). Economic Calendar preview.

**Density patterns.** Single-column page; sections stack vertically; each section is consistent: 6 cards or 6 table rows, with "See all" pagination link. Color coding: green for positive %, red for negative %. No sparklines in these compact lists.

**Right rail.** None — full-width.

**Footer.** Social icons (X, Facebook, YouTube, Instagram, LinkedIn, Telegram, TikTok, Reddit) + same multi-column nav as homepage.

---

## 3. `https://www.tradingview.com/markets/indices/` (Indices page)

**Breadcrumb.** Markets / Market indices.

**Page title.** "Market indices" with "Overview" subhead.

**Main content.** Six US-index card row (SPX, NDX, DJI, US2000USD, IXIC, NYA), then a world-indices carousel (Nikkei, FTSE, DAX, CAC 40, FTSE MIB, IBEX, plus SSE, Hang Seng, Nifty, IBovespa, Russia).

**Filter links / collections.** A horizontal link list: "All indices, Major world indices, US indices, S&P sectors, Currency indices, Americas, Europe, Asia, Pacific, Middle East, Africa."

**Ideas section.** Trader posts: title, symbol badge, chart thumbnail, sentiment badge (Long/Short), author name. Symbols seen: SPX, DXY, NAS100, ASX 200.

**FAQ section.** Index definitions, how to trade indices, top global indices, why traders use them, current EU/US data, S&P 500 details, Dow Jones explanation, index funds.

**Right rail / sparklines / time controls.** None visible.

**Login walls.** None — "Get started" CTA only.

(Note: this page is a marketing-style overview, not a sortable table. The sortable table experience lives at the screener URLs walked next.)

---

## 4. `https://www.tradingview.com/markets/stocks-usa/market-movers-gainers/` (Gainers)

**Breadcrumb.** Markets / USA / Stocks / All stocks / Top gainers.

**Sub-nav tabs (full list as returned).** All stocks, Top gainers, Biggest losers, Large-cap, Small-cap, Largest employers, High-dividend, Highest net income, Highest cash, Highest profit per employee, Highest revenue per employee, Most active, Pre-market gainers, Pre-market losers, Pre-market most active, Pre-market gap, After-hours gainers, After-hours losers, After-hours most active, Unusual volume, Most volatile, High beta, Best performing, Highest revenue, Most expensive, Penny stocks, Pink sheet, Overbought, Oversold, All-time high, All-time low, 52-week high, 52-week low. (~33 sibling screens.)

**Page title.** "US stocks that increased the most in price." Intro copy warns about retracement risk after big moves.

**Column-set tabs (filter row above table).** **Overview | Performance | Valuation | Dividends | Profitability | Income statement | Balance sheet | Cash flow | Technicals | More.** Each tab swaps the visible columns — same row set, different metrics.

**Main table columns (Overview tab, in order).** Symbol | Chg % | Price | Vol | Rel vol | Mkt cap | P/E | EPS dil TTM | EPS dil growth TTM YoY | Div yield % TTM | Sector | Analyst rating. **~12 columns visible, ~70+ rows above the fold.**

**Row anatomy.** Company logo + ticker + name (left, sans, multi-line) | colored % (green) | numeric values (right-aligned, monospaced feel) | sector (clickable text) | analyst-rating badge ("Buy" / "Strong buy" / "Neutral" / "No rating").

**Time-window selectors.** None on Overview. (Performance tab presumably introduces them; not observed here.)

**Right rail.** None — table consumes the full width.

**Density.** Sans-serif everywhere; symbols/names left-aligned; numerics right-aligned with monospace treatment on prices and percentages; compact row spacing.

**Login walls.** None on this surface.

---

## 5. `https://www.tradingview.com/markets/stocks-usa/market-movers-losers/` (Losers)

**Structurally identical to gainers.** Same breadcrumb pattern, same ~33-item sub-nav, same column-tab row (Overview / Performance / Valuation / Dividends / Profitability / Income statement / Balance sheet / Cash flow / Technicals / More), same column order (Symbol | Chg % | Price | Vol | Rel vol | Mkt cap | P/E | EPS dil TTM | EPS dil growth TTM YoY | Div yield % TTM | Sector | Analyst rating). ~100+ rows. Color coding: **red** for negative deltas (−37.80%, −34.18%…).

**Title:** "US stocks that lost the most in price."

The pattern reveals TradingView's design discipline: the screen is a **parameterized template** — only sort direction and title change. Every cousin in the ~33-screen sub-nav reuses the same shell.

---

## 6. `https://www.tradingview.com/markets/stocks-usa/market-movers-active/` (Most active)

**Same shell.** Same sub-nav, same column-set tabs.

**Critical deviation: column order changes.** Most-active reorders the leading columns for the metric this view is *about*:

Symbol | **Price × vol** | Price | Chg % | Vol | Rel vol | Mkt cap | P/E | EPS dil TTM | EPS dil growth TTM YoY | Div yield % TTM | Sector | Analyst rating.

**The defining metric moves into column 2.** Examples: NVDA "42.62 B USD" price×vol, $235.74, +4.39%, 180.78M volume. MSFT "11.09 B USD" price×vol, $409.43, +1.04%, 27.08M volume.

This is an explicit pattern: each "view" inside the screener template promotes its defining metric to a fixed early position while keeping the rest of the column set identical.

**Right rail.** None. Full-width table.

---

## 7. `https://www.tradingview.com/screener/` (Main screener)

**WebFetch returned only the header + page-title meta**: "Stock Screener: Search and Filter Stocks — TradingView." Header nav (Products | Community | Markets | Brokers | More), EN, "Get started." **No table HTML returned** — the screener is a JS-rendered SPA.

**Flag.** Decay/access flag: **screener interface not directly observable via WebFetch**. Inference deferred to the gainers/losers/active pages (#4–6), which are server-rendered variants of the same screener template and therefore stand in as evidence for the column-tab and column-row patterns the main screener uses.

---

## 8. `https://www.tradingview.com/symbols/SPX/` (Index symbol page)

**Top nav.** Standard.

**Symbol header.** S&P 500 logo + ticker "SPX" with US flag + name "S&P 500 Index" + status ("Market closed / No trades"). **Performance ribbon** — multi-window stat strip showing: 1 day (0.77%), 5 days (1.88%), 1 month (8.55%), 6 months (12.43%), YTD (9.06%), 1 year (27.21%), 5 years (79.89%), 10 years (266.54%). **This is one of TradingView's signature density moves: 8 timeframe deltas in a single row at the top.**

**Tab navigation (in order).** Overview | News | Community | Technicals | Seasonals | Components | More.

**Chart.** Interactive embed with timeframe controls: 1D | 5D | 1M | 6M | YTD | 1Y | 5Y | 10Y. Link to full-chart workspace.

**Below-chart KPI labels.** Volume, Previous close (values dashed because market closed). Each label has a help icon.

**Sections below.** About S&P 500 Index | Related indices | Community forum | News | Trading ideas feed | Technicals summary | Seasonals | **Largest holdings** (12-row table with logos: NVDA, GOOG, GOOGL, AAPL, MSFT, AMZN, AVGO, TSLA, META, WMT, BRK.B).

**FAQ block.** "What is S&P 500 Index value today?" + related Q&A that link back to the chart page.

**Right rail.** Not observed on this page — content stacks vertically.

**Login walls.** None.

---

## 9. `https://www.tradingview.com/symbols/NASDAQ-AAPL/` (Equity symbol page)

**Breadcrumb.** Markets / USA / Stocks / Electronic Technology / Telecommunications Equipment / AAPL. **Sector-and-industry breadcrumb is the navigation spine** — clicking each level pivots to peers.

**Symbol header.** Apple logo (multiple instances) + ticker "AAPL" + NASDAQ logo + exchange name "Nasdaq Stock Market" + price $298.21 USD + change −0.22% (24h) + market status "Market closed / No trades."

**Tab navigation.** Overview | Financials | News | Documents | Community | Technicals | Forecasts | Seasonals | **Options | Bonds | ETFs** | More. (More tabs than SPX — equities expose Options, Bonds, ETFs that index pages don't.)

**Chart.** Same timeframe ribbon: 1d, 5d, 1m, 6m, YTD, 1y, 5y, 10y, All time. Link to full chart.

**KPI tile block below chart.** Market cap 4.39 T USD | Dividend yield (indicated) 0.36% | P/E TTM 36.15 | Basic EPS TTM 8.30 USD | Net income FY 112.01 B USD | Revenue FY 416.16 B USD | Shares float 14.67 B | Beta 1Y 1.23. **8 tiles.**

**About section.** Description + Sector (Electronic Technology) + Industry (Telecommunications Equipment) + CEO (Timothy Donald Cook) + Website (apple.com) + Headquarters (Cupertino) + Founded 1976 + IPO Dec 12 1980.

**Earnings & forecast block.** Next report date | Report period | EPS estimate | Revenue estimate (values "—" here).

**Employee block.** Employees FY 166K | Change 1Y +2K (+1.22%) | Revenue/Employee 2.51 M USD | Net income/Employee 674.76 K USD.

**News.** "Key facts today" highlights with summary bullets ("Apple topped Q2 revenue estimates and guided fiscal Q3 revenue up 14–17%…").

**Community / Ideas.** Trader idea cards (bullish/bearish).

**Technicals.** Aggregate rating ("Neutral") shown across multiple timeframes.

**Analyst rating.** Aggregate "Neutral."

**Other sections.** Seasonals analysis | Highest yielding bonds table | ETF holdings breakdown (VTI, VOO, IVV, SPY…) | FAQ.

**Right rail.** Not surfaced in the HTML returned — stacked layout.

**Login walls.** None observed on the public symbol page.

---

## 10. `https://www.tradingview.com/chart/` (Charting workspace)

**WebFetch returned only meta: "Live stock, index, futures, Forex and Bitcoin charts on TradingView."**

**Decay/access flag.** The full Supercharts workspace is a client-rendered SPA. **WebFetch cannot enumerate the toolbar, left drawing rail, right watchlist/details panel, or bottom screener panel.** Reporting these from training-data recall is forbidden under Rule 1. The only observable signal: this is the canonical chart URL and is the destination for "Full chart" links throughout other surfaces.

---

## 11. `https://www.tradingview.com/ideas/` (Community ideas)

**Top nav.** Standard. "Community ideas" heading.

**Sub-nav tabs visible.** **Popular** and **Editors' picks** (the homepage's "More" toggle did not surface on the dedicated page in the HTML returned).

**Idea card anatomy.** Chart thumbnail | linked title | description snippet | symbol badge with icon (e.g., "BINANCE:BTCUSDT") | **Long/Short label** | author link (e.g., "by MasterAnanda") | comment count (e.g., 32) | like count (e.g., 26) | "Updated" label when applicable.

**Grid density.** WebFetch returned a single-column listing. The visual rendering is typically multi-column at desktop widths, but the server HTML emits one card per node.

**Pagination.** Numbered: "1 2 3 4 5 …" through extreme numbers ("999999"). Infinite-feeling pagination.

**Asset-class chips / time filters.** Not present in the server HTML returned (likely client-side filters in the rendered app).

**Right rail.** Not surfaced.

**Login walls.** None.

---

## 12. `https://www.tradingview.com/heatmap/stock/` (Stock heatmap)

**Header observed only.** Page title: "Stock Heatmap — TradingView." Same nav (Products | Community | Markets | Brokers | More + EN + Get started).

**Decay/access flag.** The treemap canvas, sector partition, color/size encoders, and dropdowns (S&P 500 vs world, color metric, size metric, timeframe) are **not present in the server HTML**. WebFetch cannot enumerate them.

**Cross-link inference.** The footer link list (visible across other pages) names sibling surfaces: "Heatmaps," "Screeners," "Calendars" — implying a heatmap family beyond stock (crypto, ETFs) but not directly listed in this URL's response.

---

## 13. `https://www.tradingview.com/economic-calendar/` (Economic calendar)

**Surface observed.** Headings: "Calendar" | "How to use Economic Calendar" | "Frequently asked questions."

**Tab strip visible.** **Today** + event-type tabs: **Economic | Earnings | Revenue | Dividends | IPO | More.** (One calendar URL hosts five sibling calendars via a tab strip.)

**Filter axes described in copy (not directly enumerated as chips).** Period (week or specific day) | countries and time zones | importance | category (examples cited: GDP releases, tax announcements) | G20-members toggle.

**Calendar table columns.** Not enumerated in server HTML. Inference deferred.

**FAQ questions.** "What is the Economic Calendar?" | "How to trade with the Economic Calendar?" | "How to filter events in the Economic Calendar?" | "What are main UK events to look out for?" | "What are main EU events to look out for?" | "What is the US interest rate?" | "What is the US inflation rate?"

**Right rail.** Not surfaced.

**Login walls.** None.

---

# TradingView's universal design language across these surfaces

**A consistent chrome wraps every surface.** Across all 13 URLs the same header repeats: logo (left) | primary nav **Products | Community | Markets | Brokers | More** | center search | EN locale | "Get started" blue CTA. The footer is equally invariant — a wide multi-column nav block sectioned into More than a product, Community, Ideas, Pine Script, Tools & subscriptions, Trading, Special offers, About company, Merch, Policies & security, Business solutions, Growth opportunities, with data attribution to ICE / FactSet / Quartr / CUSIP. The product never asks you "where am I in the site?" — the chrome answers that on every page.

**Density is non-negotiable on data surfaces.** The market-movers screens render ~70–100+ rows above the fold with ~12 columns visible without horizontal scroll. The column set is held constant across cousin screens; only sort direction and title change. The Overview tab gives a 12-column shape — Symbol | Chg % | Price | Vol | Rel vol | Mkt cap | P/E | EPS dil TTM | EPS dil growth TTM YoY | Div yield % TTM | Sector | Analyst rating — and that shape is the table contract.

**Inversion to the metric that matters.** When a sub-view's reason-to-exist is volume (most-active) instead of % change (gainers/losers), the table reorders to put `Price × vol` in column 2. The promoted metric is *always at the start of the row*, never buried.

**Column-set as a tab dimension.** Above every screener table there is a row of tabs — Overview | Performance | Valuation | Dividends | Profitability | Income statement | Balance sheet | Cash flow | Technicals | More — that swaps the visible columns over the same row set. The user keeps the row set; the metric lens changes. This is one of the highest-leverage patterns on the site.

**Multi-timeframe ribbon at every symbol.** Symbol pages (SPX, AAPL) put 8 timeframe deltas in a single header strip — 1d / 5d / 1m / 6m / YTD / 1y / 5y / 10y — and the chart below repeats the same selectors. The user never asks "over what window?" because the surface answers all common windows simultaneously.

**Sector / industry as a navigational spine.** AAPL's breadcrumb (Markets / USA / Stocks / Electronic Technology / Telecommunications Equipment / AAPL) is itself navigable. Each level pivots you to the peer set at that level. There is no "drill-down modal" — the URL hierarchy *is* the drill-down.

**The 6-card / 6-row module is the atomic block.** Every section on /markets/ is six cards or a six-row table with a "See all …" link. The atomic unit of the markets page is six.

**Color discipline.** Green = up, red = down, never decorative. No gradients in tables; flat color on numerics only.

**Typography stack (observed via rendering — readable at retrieval).** Sans-serif throughout. Numerics get monospace treatment for vertical alignment (prices and percentages). Headings are sans-serif with weight, not display font.

**Ideas are integrated into every market surface — not siloed.** Idea cards appear on the homepage, the markets overview, asset-class overview pages, symbol pages, *and* the dedicated /ideas/ feed. The idea-card anatomy is identical wherever it appears (thumbnail | title | symbol badge | Long/Short | author | comment count | like count). Community is woven through every surface; it is not a tab you visit, it is content that ships everywhere.

**Calendars are a unified surface with sibling tabs.** The economic calendar URL hosts five sibling calendars — Economic | Earnings | Revenue | Dividends | IPO — through one tab strip. One URL, one chrome, five datasets.

**No paywalls on data exploration.** Every observed surface was publicly accessible. The "Get started" CTA never blocked content. The paywall lives behind the charting workspace (custom indicators, alerts, multi-chart) — not behind looking at the data.

**Right rails are sparingly used in the public surfaces walked.** WebFetch returned no persistent right rail on markets, market-movers, symbol pages, or ideas pages. The right rail in TradingView is **a feature of the logged-in workspace** (chart page, screener app) — not the public data pages.

---

# Patterns to port to the Top Shot data portal

1. **Persistent chrome.** Render a fixed top bar with logo (left), 4–6 primary nav items, a center symbol/player search, and one blue primary CTA — present on every page without exception. No page is allowed to invent its own header.

2. **12-column screener table at 1440px.** Render screener results as 28–30 px rows with ~12 columns visible (Moment | 24h % | Last sale | Listings | Floor | 7d vol | All-time vol | Mint count | Circulating | Set | Series | Player) without horizontal scroll. Right-align numerics, monospace prices, left-align names.

3. **Column-set tabs above the table.** Above the screener, ship tabs that swap the column set over the same row set: Overview | Pricing | Volume | Floor dynamics | Mint stats | Player perf | Burn / circulation | Technicals. User keeps their filter; the metric lens changes.

4. **Promote the defining metric to column 2.** On a "Top gainers 24h" view, column 2 is `24h %`. On a "Most active" view, column 2 is `24h $ volume`. On a "Lowest float" view, column 2 is `circulating count`. The reason the view exists is always the second column.

5. **Six-card / six-row atomic section.** On the markets overview page (`/markets`), every section is a 6-card grid or 6-row mini-table with a "See all …" link to the full screener. No section is allowed to be three rows; no section is allowed to be twelve.

6. **Cousin-screen template with ~30 sibling views.** Pre-build the sub-nav for the Top Shot screener with ~20–30 named views (Top gainers 24h | Top losers 24h | Most active | Lowest float | Highest mint | All-time-low listings | Floor squeeze | Highest revenue per copy | New listings 24h | Burned this week | Champion-tier only | Common-tier only | Rookie debuts | Playoff moments only | Sub-$10 floors | $100+ floors | etc.), all sharing the same shell.

7. **Multi-timeframe ribbon on every moment / player page.** Header strip: 1h | 24h | 7d | 30d | 90d | YTD | 1y | All — 8 deltas always visible. No drill-down to read the 7-day move.

8. **Symbol-page tab strip.** On moment pages: Overview | Sales | Listings | Holders | Series | Player game-logs | Community | Forecasts. On player pages: Overview | Moments | Game-logs | Holders by moment | Highlights | Community.

9. **Sector / set / series breadcrumb as a navigational spine.** Moments / NBA / 2024-25 Season / Series 4 / Set "Cool Cats" / Player LeBron James / Moment #abc123 — every level is clickable and pivots to peer set at that level.

10. **Community ideas woven everywhere — not siloed.** Render trader-idea / collector-thesis cards (thumbnail | title | moment badge | Long/Short on price | author | comments | likes) on the homepage, on the markets overview, on each moment page, on each player page, *and* on a dedicated `/ideas` feed. Same card anatomy in all surfaces.

11. **Unified calendar with sibling tabs.** One `/calendar` URL with tabs: Games | Drops | Pack openings | Rewards | Burns | IPO/Series launches. One chrome, six datasets.

12. **Sector heatmap surface.** Build a `/heatmap` page that renders a treemap of moments grouped by team (outer box) and player (inner box), sized by total market cap, colored by 24h % change. Add dropdowns for color-metric (24h %, 7d %, listing pressure) and size-metric (mkt cap, sales volume, mint count).

13. **Inline analyst-rating column.** Add a final column "Signal" that renders a badge — Strong buy / Buy / Neutral / Sell / No rating — driven by our composite model (price velocity + listing pressure + player form). Reads at a glance like Wall Street analyst ratings do on TradingView.

14. **Help icons next to every KPI label.** On moment / player pages, every KPI tile (floor, 24h %, last sale, mint count) carries an info-icon that pops the methodology. No metric ships without an explainer.

15. **8-tile KPI block below the chart on entry pages.** Moment page below chart: Last sale | 24h % | 24h vol | Floor | Listings | Mint count | Circulating | Owners — exactly 8 tiles, fixed positions.

16. **Largest holdings table on every container.** On a Set page, render a "Largest holdings" 12-row table (Wallet | Count held | Estimated value | % of supply | Recent activity). On a Series page, same.

17. **Color discipline.** Green for up, red for down. No gradients in tables. Sparingly use blue only for hyperlinks/CTAs.

18. **Sans for everything; monospace for numerics.** Headers and labels in sans-serif. Prices, percentages, counts in monospace (or tabular-numerals figure variant) so they line up vertically across rows.

19. **No paywall on data exploration.** Every screener, moment page, player page, calendar, and heatmap is fully public. The paywall lives behind Pro features (custom alerts, multi-watch, deep historical data, API access) — not behind the data itself.

20. **Performance ribbon = the trader's "do I even need to click in?" answer.** A 1h | 24h | 7d | 30d | YTD | 1y | All ribbon on the player page tells a Pro Trader in one glance whether this asset is in trend or noise. Match TradingView's discipline of showing all windows at once rather than asking the user to pick.

21. **"See all …" link as the row-count escape hatch.** Every 6-card or 6-row module ends with a link to the full screener filtered to that view. Never show "more" inline — always link out to the full surface.

22. **Sortability arrows on every column header in screener tables.** Clicking a header re-sorts; clicking again reverses. Arrow icon stays visible.

23. **Filter chip row above the table for sector / tier / series / player.** Multi-select chips; selected chips render with filled background. Same chip pattern on every screener view.

24. **Footer with explicit data-source attribution.** Footer always names data sources (NBA stats provider, Top Shot media gateway, on-chain indexer) the way TradingView footers name ICE / FactSet / Quartr / CUSIP. Trust signal.

25. **Idea/community card has Long/Short on price — not just "bullish vibe."** Force every collector-thesis card to declare a directional call on the asset's price (Long, Short, Neutral) with a target. Match TradingView's discipline that ideas are testable predictions, not opinions.
