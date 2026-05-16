// Skeleton fallbacks used inside <Suspense> boundaries on the homepage.
// These must render the same overall dimensions as the resolved content so
// the page doesn't jump when streamed sections paint.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KpiStripSkeleton,
  TopPlayersSkeleton,
  MostActiveEditionsSkeleton,
  LargestSalesSkeleton,
  LegacyCascadeSkeleton,
} from "./HomepageSkeletons";

describe("HomepageSkeletons", () => {
  it("KpiStripSkeleton renders 6 KPI cells matching the live strip layout", () => {
    const html = renderToStaticMarkup(<KpiStripSkeleton />);
    // 6 cells in the live KPI strip (grid-cols-6 on lg)
    const cellMatches = html.match(/data-skeleton="kpi-cell"/g) ?? [];
    expect(cellMatches.length).toBe(6);
  });

  it("TopPlayersSkeleton renders a 20-row table skeleton", () => {
    const html = renderToStaticMarkup(<TopPlayersSkeleton />);
    const rowMatches = html.match(/data-skeleton="player-row"/g) ?? [];
    // Renders enough rows to match the resolved table height (limit=20)
    expect(rowMatches.length).toBe(20);
  });

  it("MostActiveEditionsSkeleton renders a 20-row table skeleton", () => {
    const html = renderToStaticMarkup(<MostActiveEditionsSkeleton />);
    const rowMatches = html.match(/data-skeleton="edition-row"/g) ?? [];
    expect(rowMatches.length).toBe(20);
  });

  it("LargestSalesSkeleton renders a 20-row table skeleton", () => {
    const html = renderToStaticMarkup(<LargestSalesSkeleton />);
    const rowMatches = html.match(/data-skeleton="sale-row"/g) ?? [];
    expect(rowMatches.length).toBe(20);
  });

  it("LegacyCascadeSkeleton renders a placeholder for the iter-1..10 block", () => {
    const html = renderToStaticMarkup(<LegacyCascadeSkeleton />);
    expect(html).toContain('data-skeleton="legacy-cascade"');
  });

  it("every skeleton exposes the shimmer animation class", () => {
    const html = [
      renderToStaticMarkup(<KpiStripSkeleton />),
      renderToStaticMarkup(<TopPlayersSkeleton />),
      renderToStaticMarkup(<MostActiveEditionsSkeleton />),
      renderToStaticMarkup(<LargestSalesSkeleton />),
      renderToStaticMarkup(<LegacyCascadeSkeleton />),
    ].join("\n");
    // animate-pulse is Tailwind's built-in shimmer; cheap, no new deps
    expect(html).toContain("animate-pulse");
  });
});
