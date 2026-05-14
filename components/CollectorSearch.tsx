"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CollectorSearch() {
  const router = useRouter();
  const [v, setV] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = v.trim().replace(/^@/, "");
    if (!clean) return;
    if (/^[0-9a-fA-F]{16}$/.test(clean) || /^0x[0-9a-fA-F]{16}$/.test(clean)) {
      router.push(`/u/0x${clean.replace(/^0x/, "")}`);
    } else {
      router.push(`/u/${encodeURIComponent(clean)}`);
    }
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-72">
        <input
          ref={inputRef}
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="/ to search · username or 0x…"
          className="w-full bg-[var(--bg-elev)] border border-[var(--border)] rounded px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] outline-none"
        />
      </div>
      <button
        type="submit"
        className="bg-[var(--accent)] text-[var(--bg)] font-semibold text-sm px-3 py-2 rounded hover:opacity-90"
      >
        Pull →
      </button>
    </form>
  );
}
