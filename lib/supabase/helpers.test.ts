import { describe, it, expect } from "vitest";
import {
  windowToPlayerVolumeView,
  windowToMarketView,
  windowToPlayerView,
  windowToLargestSalesView,
  windowToEditionActivityView,
  windowLabel,
  parseWindow,
  freshnessBucket,
  computeDeltaPct,
} from "./helpers";

describe("windowToPlayerVolumeView (legacy alias)", () => {
  it("maps 24h to the 24h MV", () => {
    expect(windowToPlayerVolumeView("24h")).toBe("mv_player_24h_volume");
  });
  it("maps 7d to the 7d MV", () => {
    expect(windowToPlayerVolumeView("7d")).toBe("mv_player_7d_volume");
  });
  it("maps 30d to the 30d MV", () => {
    expect(windowToPlayerVolumeView("30d")).toBe("mv_player_30d_volume");
  });
  it("maps 90d to the 90d MV", () => {
    expect(windowToPlayerVolumeView("90d")).toBe("mv_player_90d_volume");
  });
  it("maps 1y to the 1y MV", () => {
    expect(windowToPlayerVolumeView("1y")).toBe("mv_player_1y_volume");
  });
  it("maps all to the all-time MV", () => {
    expect(windowToPlayerVolumeView("all")).toBe("mv_player_all_time_volume");
  });
});

describe("windowToMarketView", () => {
  it("maps 24h to mv_market_summary_24h", () => {
    expect(windowToMarketView("24h")).toBe("mv_market_summary_24h");
  });
  it("maps 7d to mv_market_summary_7d", () => {
    expect(windowToMarketView("7d")).toBe("mv_market_summary_7d");
  });
  it("maps 30d to mv_market_summary_30d", () => {
    expect(windowToMarketView("30d")).toBe("mv_market_summary_30d");
  });
  it("maps 90d to mv_market_summary_90d", () => {
    expect(windowToMarketView("90d")).toBe("mv_market_summary_90d");
  });
  it("maps 1y to mv_market_summary_1y", () => {
    expect(windowToMarketView("1y")).toBe("mv_market_summary_1y");
  });
  it("maps all to mv_market_summary_all_time", () => {
    expect(windowToMarketView("all")).toBe("mv_market_summary_all_time");
  });
});

describe("windowToPlayerView", () => {
  it("maps each window to its player-volume MV", () => {
    expect(windowToPlayerView("24h")).toBe("mv_player_24h_volume");
    expect(windowToPlayerView("7d")).toBe("mv_player_7d_volume");
    expect(windowToPlayerView("30d")).toBe("mv_player_30d_volume");
    expect(windowToPlayerView("90d")).toBe("mv_player_90d_volume");
    expect(windowToPlayerView("1y")).toBe("mv_player_1y_volume");
    expect(windowToPlayerView("all")).toBe("mv_player_all_time_volume");
  });
});

describe("windowToLargestSalesView", () => {
  it("maps 24h to mv_largest_sales_24h", () => {
    expect(windowToLargestSalesView("24h")).toBe("mv_largest_sales_24h");
  });
  it("maps 7d to mv_largest_sales_7d", () => {
    expect(windowToLargestSalesView("7d")).toBe("mv_largest_sales_7d");
  });
  it("maps 30d to mv_largest_sales_30d", () => {
    expect(windowToLargestSalesView("30d")).toBe("mv_largest_sales_30d");
  });
  it("collapses 90d to mv_largest_sales_30d (no 90d variant for this family)", () => {
    expect(windowToLargestSalesView("90d")).toBe("mv_largest_sales_30d");
  });
  it("maps 1y to mv_largest_sales_1y", () => {
    expect(windowToLargestSalesView("1y")).toBe("mv_largest_sales_1y");
  });
  it("maps all to mv_largest_sales_all_time", () => {
    expect(windowToLargestSalesView("all")).toBe("mv_largest_sales_all_time");
  });
});

describe("windowToEditionActivityView", () => {
  it("maps 24h to mv_edition_24h_activity", () => {
    expect(windowToEditionActivityView("24h")).toBe("mv_edition_24h_activity");
  });
  it("maps 7d to mv_edition_7d_activity", () => {
    expect(windowToEditionActivityView("7d")).toBe("mv_edition_7d_activity");
  });
  it("maps 30d to mv_edition_30d_activity", () => {
    expect(windowToEditionActivityView("30d")).toBe("mv_edition_30d_activity");
  });
  it("collapses 90d to mv_edition_30d_activity (no 90d variant for this family)", () => {
    expect(windowToEditionActivityView("90d")).toBe("mv_edition_30d_activity");
  });
  it("maps 1y to mv_edition_1y_activity", () => {
    expect(windowToEditionActivityView("1y")).toBe("mv_edition_1y_activity");
  });
  it("maps all to mv_edition_all_time_activity", () => {
    expect(windowToEditionActivityView("all")).toBe(
      "mv_edition_all_time_activity",
    );
  });
});

describe("parseWindow", () => {
  it("defaults to 24h when raw is undefined", () => {
    expect(parseWindow(undefined)).toBe("24h");
  });
  it("defaults to 24h when raw is empty", () => {
    expect(parseWindow("")).toBe("24h");
  });
  it("defaults to 24h when raw is unknown", () => {
    expect(parseWindow("not-a-window")).toBe("24h");
  });
  it("accepts each valid window verbatim", () => {
    expect(parseWindow("24h")).toBe("24h");
    expect(parseWindow("7d")).toBe("7d");
    expect(parseWindow("30d")).toBe("30d");
    expect(parseWindow("90d")).toBe("90d");
    expect(parseWindow("1y")).toBe("1y");
    expect(parseWindow("all")).toBe("all");
  });
});

describe("windowLabel", () => {
  it("returns human-readable labels per spec", () => {
    expect(windowLabel("24h")).toBe("24h");
    expect(windowLabel("7d")).toBe("7d");
    expect(windowLabel("30d")).toBe("30d");
    expect(windowLabel("90d")).toBe("90d");
    expect(windowLabel("1y")).toBe("1y");
    expect(windowLabel("all")).toBe("all-time");
  });
});

describe("freshnessBucket", () => {
  it("returns green when last_success_at is within 30 minutes", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const last = new Date("2026-05-15T11:50:00Z"); // 10m ago
    expect(freshnessBucket(last, now)).toEqual({
      bucket: "green",
      minutesAgo: 10,
    });
  });

  it("returns yellow when last_success_at is between 30 and 60 minutes", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const last = new Date("2026-05-15T11:15:00Z"); // 45m ago
    expect(freshnessBucket(last, now)).toEqual({
      bucket: "yellow",
      minutesAgo: 45,
    });
  });

  it("returns red when last_success_at is older than 60 minutes", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const last = new Date("2026-05-15T10:30:00Z"); // 90m ago
    expect(freshnessBucket(last, now)).toEqual({
      bucket: "red",
      minutesAgo: 90,
    });
  });

  it("returns red with minutesAgo=null when last is null", () => {
    expect(freshnessBucket(null, new Date()).bucket).toBe("red");
    expect(freshnessBucket(null, new Date()).minutesAgo).toBe(null);
  });
});

describe("computeDeltaPct", () => {
  it("returns positive % when now > prior", () => {
    expect(computeDeltaPct(110, 100)).toBeCloseTo(10);
  });
  it("returns negative % when now < prior", () => {
    expect(computeDeltaPct(90, 100)).toBeCloseTo(-10);
  });
  it("returns null when prior is 0 (avoid divide-by-zero)", () => {
    expect(computeDeltaPct(50, 0)).toBe(null);
  });
  it("returns null when prior is null", () => {
    expect(computeDeltaPct(50, null)).toBe(null);
  });
  it("returns null when now is null", () => {
    expect(computeDeltaPct(null, 100)).toBe(null);
  });
});
