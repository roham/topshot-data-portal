"use client";
import Link from "next/link";
import { useState } from "react";

const ROUTES: Array<[string, Array<[string, string]>]> = [
  ["Market", [["/", "Market"], ["/movement", "Movement"], ["/whales", "Whales"], ["/specials", "Specials"], ["/anomalies", "Anomalies"]]],
  ["Discovery", [["/players", "Players"], ["/teams", "Teams"], ["/sets", "Sets"], ["/leaderboards", "Ladders"]]],
  ["Collectors", [["/collectors", "Collectors"], ["/compare", "Compare"], ["/watching", "Watching"]]],
  ["Time", [["/trends", "Trends"], ["/archive", "Archive"], ["/on-this-day", "OnThisDay"]]],
  ["Meta", [["/rules", "Rules"], ["/methodology", "Methodology"], ["/changelog", "Changelog"]]],
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden text-xs text-[var(--text-dim)] border border-[var(--border)] rounded px-2 py-1"
        aria-label="Open navigation menu"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="sm:hidden absolute top-12 left-0 right-0 bg-[var(--bg)] border-b border-[var(--border)] z-40 shadow-lg">
          <nav className="px-4 py-3 space-y-3 text-sm">
            {ROUTES.map(([section, links]) => (
              <div key={section}>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-1">{section}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {links.map(([href, label]) => (
                    <Link key={href} href={href} onClick={() => setOpen(false)} className="text-[var(--text)] hover:text-[var(--accent)]">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
