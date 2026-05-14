"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";

const KEY = "topshot-watching:v1";

interface BagSummary {
  username: string;
  flowAddress: string | null;
  total: number | null;
  favTeam: string | null;
  topPlayer: { name: string; count: number } | null;
  recentBuys: number;
  recentSells: number;
  loading: boolean;
  error?: string;
}

export default function WatchingPage() {
  const [list, setList] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<BagSummary[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setList(Array.isArray(stored) ? stored : []);
    } catch {
      setList([]);
    }
  }, []);

  useEffect(() => {
    if (!list.length) return;
    let cancelled = false;
    (async () => {
      const out: BagSummary[] = list.map((u) => ({ username: u, flowAddress: null, total: null, favTeam: null, topPlayer: null, recentBuys: 0, recentSells: 0, loading: true }));
      // Fetch recent window once
      const recentRes = await fetch("/api/topshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query{searchMarketplaceTransactions(input:{filters:{},searchInput:{pagination:{cursor:"",direction:RIGHT,limit:200}}}){data{searchSummary{data{... on MarketplaceTransactions{data{id buyer{username}seller{username}}}}}}}}`,
        }),
      }).then((r) => r.json()).catch(() => null);
      const txns = recentRes?.data?.searchMarketplaceTransactions?.data?.searchSummary?.data?.data ?? [];
      const buys = new Map<string, number>();
      const sells = new Map<string, number>();
      for (const t of txns) {
        if (t.buyer?.username) buys.set(t.buyer.username, (buys.get(t.buyer.username) ?? 0) + 1);
        if (t.seller?.username) sells.set(t.seller.username, (sells.get(t.seller.username) ?? 0) + 1);
      }
      setSummaries(out);
      for (let i = 0; i < list.length; i++) {
        const u = list[i];
        try {
          const r1 = await fetch("/api/topshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `query($u:String!){getUserProfileByUsername(input:{username:$u}){publicInfo{username dapperID flowAddress favoriteTeamID}}}`,
              variables: { u },
            }),
          }).then((r) => r.json());
          const profile = r1?.data?.getUserProfileByUsername?.publicInfo;
          if (!profile?.flowAddress) {
            out[i] = { ...out[i], loading: false, error: "not found" };
            if (!cancelled) setSummaries([...out]);
            continue;
          }
          const r2 = await fetch("/api/topshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `query($a:[String]){searchMintedMoments(input:{filters:{byOwnerFlowAddress:$a},searchInput:{pagination:{cursor:"",direction:RIGHT,limit:60}}}){data{searchSummary{totalCount data{... on MintedMoments{data{play{stats{playerName}}}}}}}}}`,
              variables: { a: [profile.flowAddress] },
            }),
          }).then((r) => r.json());
          const ss = r2?.data?.searchMintedMoments?.data?.searchSummary;
          const items = ss?.data?.data ?? [];
          const counts: Record<string, number> = {};
          for (const m of items) {
            const p = m?.play?.stats?.playerName;
            if (p) counts[p] = (counts[p] ?? 0) + 1;
          }
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          out[i] = {
            username: profile.username,
            flowAddress: profile.flowAddress,
            total: ss?.totalCount ?? null,
            favTeam: profile.favoriteTeamID ?? null,
            topPlayer: top ? { name: top[0], count: top[1] } : null,
            recentBuys: buys.get(profile.username) ?? 0,
            recentSells: sells.get(profile.username) ?? 0,
            loading: false,
          };
          if (!cancelled) setSummaries([...out]);
        } catch (e) {
          out[i] = { ...out[i], loading: false, error: (e as Error).message };
          if (!cancelled) setSummaries([...out]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [list]);

  const remove = (u: string) => {
    const next = list.filter((x) => x !== u);
    localStorage.setItem(KEY, JSON.stringify(next));
    setList(next);
  };

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Watching</h1>
        <p className="text-[var(--text-dim)] text-sm">
          S2 · Stored locally in your browser. Click ★ Watch on any /u/[username] to add. {list.length} on watchlist.
        </p>
      </header>
      {list.length === 0 ? (
        <Card title="Empty watchlist">
          <div className="p-4 text-sm text-[var(--text-dim)]">
            Visit any collector (try <Link href="/u/BostonBased" className="underline text-[var(--accent)]">/u/BostonBased</Link>) and click <span className="text-[var(--accent)]">☆ Watch</span> to track them.
          </div>
        </Card>
      ) : (
        <Card title="Tracked collectors">
          <div className="divide-y divide-[var(--border)]">
            {summaries.map((s) => (
              <div key={s.username} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-elev)] flex items-center justify-center text-[var(--text-faint)]">
                  {s.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${encodeURIComponent(s.username)}`} className="font-semibold text-sm hover:text-[var(--accent)]">
                    {s.username}
                  </Link>
                  <div className="text-[10px] text-[var(--text-faint)] tnum">
                    {s.loading ? "loading…" :
                      s.error ? <span className="text-[var(--down)]">{s.error}</span> :
                        <>
                          {(s.total ?? 0).toLocaleString()} moments
                          {s.topPlayer ? <> · top {s.topPlayer.name} ({s.topPlayer.count})</> : null}
                          {(s.recentBuys + s.recentSells) > 0 && (
                            <>
                              {" · "}
                              <span className="text-[var(--up)]">+{s.recentBuys} buys</span>
                              {" · "}
                              <span className="text-[var(--down)]">−{s.recentSells} sells</span>
                              <span className="text-[var(--text-faint)]"> (last 200 sales window)</span>
                            </>
                          )}
                        </>}
                  </div>
                </div>
                <button
                  onClick={() => remove(s.username)}
                  className="text-xs text-[var(--text-faint)] hover:text-[var(--down)] px-2 py-1"
                  title="Remove from watchlist"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
