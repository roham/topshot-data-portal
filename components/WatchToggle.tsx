"use client";
import { useEffect, useState } from "react";

const KEY = "topshot-watching:v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function WatchToggle({ username }: { username: string }) {
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    setWatching(read().includes(username));
  }, [username]);
  const toggle = () => {
    const list = read();
    const next = list.includes(username) ? list.filter((u) => u !== username) : [...list, username];
    write(next);
    setWatching(next.includes(username));
  };
  return (
    <button
      onClick={toggle}
      className={`text-xs px-3 py-1 rounded border ${
        watching
          ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
          : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
    >
      {watching ? "★ Watching" : "☆ Watch"}
    </button>
  );
}
