"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// V2 Phase 4.5 — refit to new design tokens + adds Linear-style G+letter
// two-stroke for primary nav (G then h/i/e/c/m).
//
// Verb grammar matches API noun structure (per design/01 §4):
//   user/u <username>          -> /u/[name]
//   player/p <id>              -> /player/[id]
//   team/t <abbr|id>           -> /team/[id]
//   set/s <id|name>            -> /set/[id]
//   edition/e <id>             -> /edition/[id]
//   moment/m <flowId>          -> /moment/[flowId]
//   index/i <slug>             -> /indices/[slug]
//   compare/vs <u1> <u2>       -> /u/[u1]?vs=[u2]
//   movers [window]            -> /?movers=window
//   watching/w                 -> /collectors?tab=watching
//   methodology                -> /methodology
//   home                       -> /
//   ?, help                    -> show grammar

type Resolver = (args: string[]) => string | null;

interface VerbDef {
  verb: string;
  aliases?: string[];
  hint: string;
  resolve: Resolver;
}

const VERBS: VerbDef[] = [
  { verb: "user", aliases: ["u"], hint: "user <username>", resolve: ([u]) => (u ? `/u/${encodeURIComponent(u)}` : null) },
  { verb: "player", aliases: ["p"], hint: "player <id>", resolve: ([id]) => (id ? `/player/${encodeURIComponent(id)}` : "/editions") },
  { verb: "team", aliases: ["t"], hint: "team <abbr or id>", resolve: ([id]) => (id ? `/team/${encodeURIComponent(id)}` : null) },
  { verb: "set", aliases: ["s"], hint: "set <id>", resolve: ([id]) => (id ? `/set/${encodeURIComponent(id)}` : null) },
  { verb: "edition", aliases: ["e"], hint: "edition <id>", resolve: ([id]) => (id ? `/edition/${encodeURIComponent(id)}` : "/editions") },
  { verb: "moment", aliases: ["m"], hint: "moment <flowId>", resolve: ([id]) => (id ? `/moment/${encodeURIComponent(id)}` : null) },
  { verb: "index", aliases: ["i"], hint: "index <slug>", resolve: ([slug]) => (slug ? `/indices/${encodeURIComponent(slug)}` : "/indices") },
  {
    verb: "compare",
    aliases: ["vs"],
    hint: "compare <u1> <u2>",
    resolve: ([a, b]) => {
      if (!a || !b) return null;
      return `/u/${encodeURIComponent(a)}?vs=${encodeURIComponent(b)}`;
    },
  },
  { verb: "movers", aliases: ["mv"], hint: "movers [window]", resolve: ([w]) => (w ? `/?movers=${encodeURIComponent(w)}` : "/?movers=24h") },
  { verb: "watching", aliases: ["w", "watch"], hint: "watching", resolve: () => "/collectors?tab=watching" },
  { verb: "methodology", aliases: ["method"], hint: "methodology", resolve: () => "/methodology" },
  { verb: "briefing", aliases: ["b"], hint: "briefing · KPIs + stories", resolve: () => "/briefing" },
  { verb: "indices", hint: "indices index", resolve: () => "/indices" },
  { verb: "editions", hint: "editions index", resolve: () => "/editions" },
  { verb: "collectors", aliases: ["co"], hint: "collectors", resolve: () => "/collectors" },
  { verb: "home", aliases: ["/", "h"], hint: "home", resolve: () => "/" },
];

const G_SHORTCUTS: Record<string, string> = {
  h: "/",
  i: "/indices",
  e: "/editions",
  c: "/collectors",
  m: "/methodology",
};

interface Suggestion {
  key: string;
  label: string;
  hint: string;
  href: string;
}

function buildSuggestions(input: string): { suggestions: Suggestion[]; helpMode: boolean } {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      helpMode: false,
      suggestions: VERBS.slice(0, 12).map((v) => ({
        key: v.verb,
        label: v.verb,
        hint: v.hint,
        href: v.resolve([]) ?? "#",
      })),
    };
  }
  if (trimmed === "?" || trimmed === "help") {
    return {
      helpMode: true,
      suggestions: VERBS.map((v) => ({ key: v.verb, label: v.verb, hint: v.hint, href: v.resolve([]) ?? "#" })),
    };
  }
  const parts = trimmed.split(/\s+/);
  const head = parts[0].toLowerCase();
  const rest = parts.slice(1);
  const match = VERBS.find((v) => v.verb === head || v.aliases?.includes(head));
  if (match) {
    const href = match.resolve(rest);
    if (href) {
      return {
        helpMode: false,
        suggestions: [
          {
            key: `${match.verb}-resolved`,
            label: `${match.verb} ${rest.join(" ")}`.trim(),
            hint: `↵  ${href}`,
            href,
          },
        ],
      };
    }
    return {
      helpMode: false,
      suggestions: [{ key: `${match.verb}-args`, label: match.verb, hint: `${match.hint}  (need args)`, href: "#" }],
    };
  }
  const matches = VERBS.filter((v) => v.verb.startsWith(head) || v.aliases?.some((a) => a.startsWith(head)));
  return {
    helpMode: false,
    suggestions: matches.slice(0, 10).map((v) => ({
      key: v.verb,
      label: v.verb,
      hint: v.hint,
      href: v.resolve([]) ?? "#",
    })),
  };
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [gPending, setGPending] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      // Cmd-K / Ctrl-K toggles anywhere.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setGPending(false);
        return;
      }

      // Linear-style G+letter two-stroke.
      if (!open && !isEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (gPending) {
          const target = G_SHORTCUTS[e.key.toLowerCase()];
          if (target) {
            e.preventDefault();
            router.push(target);
          }
          setGPending(false);
          return;
        }
        if (e.key.toLowerCase() === "g") {
          setGPending(true);
          // expire after 1.2s
          setTimeout(() => setGPending(false), 1200);
          return;
        }
        if (e.key === "/") {
          e.preventDefault();
          setOpen(true);
          return;
        }
      }

      if (open && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, gPending, router]);

  const { suggestions, helpMode } = useMemo(() => buildSuggestions(input), [input]);

  const onSelect = useCallback(
    (href: string) => {
      if (!href || href === "#") return;
      setOpen(false);
      setInput("");
      router.push(href);
    },
    [router]
  );

  if (!open) {
    if (gPending) {
      return (
        <div className="fixed bottom-4 left-4 z-50 px-2.5 py-1.5 bg-[var(--surface-3)] border border-[var(--border-strong)] rounded text-[11px] font-mono text-[var(--text-dim)]">
          g · waiting for letter… <span className="text-[var(--text-faint)]">(h, i, e, c, m)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[640px] mx-4 rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" shouldFilter={false}>
          <div className="flex items-center gap-2 px-3 h-11 border-b border-[var(--border-subtle)]">
            <span className="font-mono text-[var(--text-faint)] text-xs">▶</span>
            <Command.Input
              autoFocus
              value={input}
              onValueChange={setInput}
              placeholder="function code · try `user BostonBased`, `player 2544`, `index ts500`, `?`"
              className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none font-mono text-[12px]"
            />
            <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">esc</span>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto py-1">
            {suggestions.length === 0 && (
              <Command.Empty className="px-3 py-3 text-[var(--text-faint)] text-[11px] font-mono">
                no verb matches · type <span className="text-[var(--text-dim)]">?</span> for the grammar
              </Command.Empty>
            )}
            {helpMode && (
              <div className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">Grammar</div>
            )}
            {suggestions.map((s) => (
              <Command.Item
                key={s.key}
                value={`${s.label} ${s.hint}`}
                onSelect={() => onSelect(s.href)}
                className="px-3 py-2 cursor-pointer aria-selected:bg-[var(--surface-3)] flex items-baseline justify-between gap-4"
              >
                <span className="font-mono text-[12px] text-[var(--text)]">{s.label}</span>
                <span className="text-[var(--text-faint)] text-[11px] truncate font-mono">{s.hint}</span>
              </Command.Item>
            ))}
          </Command.List>
          <div className="px-3 h-8 flex items-center justify-between border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-faint)] font-mono">
            <span>↵ go &nbsp;·&nbsp; ↑↓ navigate &nbsp;·&nbsp; esc close</span>
            <span>⌘K toggle &nbsp;·&nbsp; G+letter quick-nav</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
