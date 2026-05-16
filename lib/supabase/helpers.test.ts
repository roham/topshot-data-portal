import { describe, it, expect } from "vitest";
import {
  windowToPlayerVolumeView,
  freshnessBucket,
  computeDeltaPct,
} from "./helpers";

describe("windowToPlayerVolumeView", () => {
  it("maps 24h to the 24h MV", () => {
    expect(windowToPlayerVolumeView("24h")).toBe("mv_player_24h_volume");
  });
  it("maps 7d to the 7d MV", () => {
    expect(windowToPlayerVolumeView("7d")).toBe("mv_player_7d_volume");
  });
  it("maps 30d to the 30d MV", () => {
    expect(windowToPlayerVolumeView("30d")).toBe("mv_player_30d_volume");
  });
  it("falls 1y through to the 30d MV with a hint flag", () => {
    expect(windowToPlayerVolumeView("1y")).toBe("mv_player_30d_volume");
  });
  it("falls all through to the 30d MV", () => {
    expect(windowToPlayerVolumeView("all")).toBe("mv_player_30d_volume");
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
