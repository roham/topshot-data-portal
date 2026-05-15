"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";

// V2 STAGE-2: function-code command bar. Grammar matches the public-api's
// own naming so the trader is learning the data model and the navigation
// at the same time.
//
// Implemented (routes to V1 surfaces):
//   user <username>            -> /u/<username>
//   player <id>                -> /player/<id>
//   team <id>                  -> /team/<id>
//   set <id>                   -> /set/<id>
//   moment <flowId>            -> /moment/<flowId>
//   movers                     -> /movement
//   compare <u1> <u2>          -> /compare?a=<u1>&b=<u2>
//   watching                   -> /watching
//   leaderboards               -> /leaderboards
//   trends                     -> /trends
//   archive                    -> /archive
//   on-this-day                -> /on-this-day
//   sets                       -> /sets
//   players                    -> /players
//   teams                      -> /teams
//   whales                     -> /whales
//   collectors                 -> /collectors
//   anomalies                  -> /anomalies
//   specials                   -> /specials
//   methodology                -> /methodology
//   rules                      -> /rules
//   help / ?                   -> shows the grammar
//
// Deferred (route does not exist yet; will be wired by later iters):
//   edition <id> | depth <editionId> | series <n> | alerts | sniper |
//   index <code> | feed | locking | volume | csv | layout save|load|name

type Resolver = (args: string[]) => string | null;

interface VerbDef {
  verb: string;
  aliases?: string[];
  hint: string;
  resolve: Resolver;
}

const VERBS: VerbDef[] = [
  { verb: "user", aliases: ["u"], hint: "user <username>", resolve: ([u]) => (u ? `/u/${encodeURIComponent(u)}` : null) },
  { verb: "player", aliases: ["p"], hint: "player <id>", resolve: ([id]) => (id ? `/player/${encodeURIComponent(id)}` : "/players") },
  { verb: "team", aliases: ["t"], hint: "team <id>", resolve: ([id]) => (id ? `/team/${encodeURIComponent(id)}` : "/teams") },
  { verb: "set", aliases: ["s"], hint: "set <id>", resolve: ([id]) => (id ? `/set/${encodeURIComponent(id)}` : "/sets") },
  { verb: "moment", aliases: ["m"], hint: "moment <flowId>", resolve: ([id]) => (id ? `/moment/${encodeURIComponent(id)}` : null) },
  {
    verb: "compare",
    aliases: ["c", "vs"],
    hint: "compare <user1> <user2>",
    resolve: ([a, b]) => {
      if (!a || !b) return null;
      return `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
    },
  },
  { verb: "movers", aliases: ["movement", "mv"], hint: "movers", resolve: () => "/movement" },
  { verb: "watching", aliases: ["watch", "w"], hint: "watching", resolve: () => "/watching" },
  { verb: "leaderboards", aliases: ["leaders", "ladders", "lb"], hint: "leaderboards", resolve: () => "/leaderboards" },
  { verb: "trends", aliases: ["tr"], hint: "trends", resolve: () => "/trends" },
  { verb: "archive", aliases: ["a"], hint: "archive", resolve: () => "/archive" },
  { verb: "on-this-day", aliases: ["otd"], hint: "on-this-day", resolve: () => "/on-this-day" },
  { verb: "whales", aliases: ["wh"], hint: "whales", resolve: () => "/whales" },
  { verb: "collectors", aliases: ["co"], hint: "collectors", resolve: () => "/collectors" },
  { verb: "anomalies", aliases: ["an"], hint: "anomalies", resolve: () => "/anomalies" },
  { verb: "specials", aliases: ["sp"], hint: "specials", resolve: () => "/specials" },
  { verb: "sets", hint: "sets directory", resolve: () => "/sets" },
  { verb: "players", hint: "players directory", resolve: () => "/players" },
  { verb: "teams", hint: "teams directory", resolve: () => "/teams" },
  { verb: "methodology", aliases: ["method"], hint: "methodology", resolve: () => "/methodology" },
  { verb: "rules", aliases: ["r"], hint: "rules / valuation engine", resolve: () => "/rules" },
  { verb: "home", aliases: ["/"], hint: "home", resolve: () => "/" },
];

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
    return { helpMode: true, suggestions: VERBS.map((v) => ({ key: v.verb, label: v.verb, hint: v.hint, href: v.resolve([]) ?? "#" })) };
  }
  const parts = trimmed.split(/\s+/);
  const head = parts[0].toLowerCase();
  const rest = parts.slice(1);
  // Exact-or-alias match → resolve directly.
  const match = VERBS.find((v) => v.verb === head || v.aliases?.includes(head));
  if (match) {
    const href = match.resolve(rest);
    if (href) {
      return {
        helpMode: false,
        suggestions: [
          { key: `${match.verb}-resolved`, label: `${match.verb} ${rest.join(" ")}`.trim(), hint: `↵  ${href}`, href },
        ],
      };
    }
    return {
      helpMode: false,
      suggestions: [{ key: `${match.verb}-args`, label: match.verb, hint: `${match.hint}  (need args)`, href: "#" }],
    };
  }
  // Prefix match against verb names.
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      // Cmd-K / Ctrl-K toggles anywhere.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // "/" opens when not typing in another input.
      if (!open && e.key === "/" && !isEditable) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Esc closes.
      if (open && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { suggestions, helpMode } = useMemo(() => buildSuggestions(input), [input]);

  const onSelect = useCallback(
    (href: string) => {
      if (!href || href === "#") return;
      setOpen(false);
      setInput("");
      router.push(href);
    },
    [router],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[640px] mx-4 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" shouldFilter={false} className="text-sm">
          <div className="flex items-center gap-2 px-3 h-11 border-b border-[var(--border)]">
            <span className="font-mono text-[var(--text-faint)] text-xs">▶</span>
            <Command.Input
              autoFocus
              value={input}
              onValueChange={setInput}
              placeholder="type a function code — try `user BostonBased`, `player 2544`, `compare a b`, or `?`"
              className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none font-mono"
            />
            <span className="text-[10px] text-[var(--text-faint)] tabular-nums">esc</span>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto py-1">
            {suggestions.length === 0 && (
              <Command.Empty className="px-3 py-3 text-[var(--text-faint)] text-xs font-mono">
                no command matches — type <span className="text-[var(--text-dim)]">?</span> for the grammar
              </Command.Empty>
            )}
            {helpMode && (
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-[var(--text-faint)] font-mono">
                Grammar
              </div>
            )}
            {suggestions.map((s) => (
              <Command.Item
                key={s.key}
                value={`${s.label} ${s.hint}`}
                onSelect={() => onSelect(s.href)}
                className="px-3 py-2 cursor-pointer aria-selected:bg-[var(--bg-card)] flex items-baseline justify-between gap-4"
              >
                <span className="font-mono text-[var(--text)]">{s.label}</span>
                <span className="text-[var(--text-faint)] text-xs truncate font-mono">{s.hint}</span>
              </Command.Item>
            ))}
          </Command.List>
          <div className="px-3 h-8 flex items-center justify-between border-t border-[var(--border)] text-[10px] text-[var(--text-faint)] font-mono">
            <span>↵ go &nbsp;·&nbsp; ↑↓ navigate &nbsp;·&nbsp; esc close</span>
            <span>cmd-k / `/` to toggle</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
