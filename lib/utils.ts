import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(v)) return "—";
  if (v >= 1000) return `$${Math.round(v).toLocaleString()}`;
  if (v >= 10) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return "—";
  const m = tier.replace("MOMENT_TIER_", "");
  return m.charAt(0) + m.slice(1).toLowerCase();
}

export function mediaUrl(flowId: string, type: "hero" | "video-square" | "video-tall" | "player" | "jersey" | "transparent" | "hero-wide", opts?: { width?: number; quality?: number }) {
  const base = `https://assets.nbatopshot.com/media/${flowId}/${type}`;
  const w = opts?.width ?? 400;
  const q = opts?.quality ?? 85;
  return `${base}?format=webp&width=${w}&quality=${q}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "—";
  const dt = Date.now() - t;
  const s = Math.floor(dt / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}
