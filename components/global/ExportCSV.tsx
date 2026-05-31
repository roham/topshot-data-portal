"use client";

// Reusable CSV export. Pro collectors model elsewhere — export is table-stakes
// per the constitution. Takes ALREADY-SERIALIZED plain data (headers + 2D rows)
// so no functions cross the server→client boundary (RSC forbids that). The
// server component maps its data to strings before passing it here.

import { useState } from "react";

type Cellish = string | number | null | undefined;

function cell(v: Cellish): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ExportCSV({
  headers,
  rows,
  filename,
}: {
  headers: string[];
  rows: Cellish[][];
  filename: string;
}) {
  const [done, setDone] = useState(false);

  function download() {
    const head = headers.map(cell).join(",");
    const body = rows.map((r) => r.map(cell).join(",")).join("\n");
    const blob = new Blob([`${head}\n${body}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2.5 py-1 font-mono text-[10px] tracking-data-label uppercase text-[var(--text-dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40 transition-colors"
      aria-label="Export CSV"
    >
      {done ? "✓ exported" : `↓ CSV (${rows.length})`}
    </button>
  );
}
