// resolveEditionOwners — for each edition, the collector who holds its
// crown-jewel serial (the LOWEST serial still owned). This is the named, real,
// proud-making human behind an edition-level highlight (Board Smash, High-Value,
// Trending): "#1 held by @username", linked to their bag.
//
// Per-edition lookup (lowest owned serial) — one indexed read each, run in
// parallel. Falls back gracefully (null) when the moment isn't in the mirror or
// the owner has no custodial username.

import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface EditionOwner {
  serial: number | null;
  username: string | null;
  flow_address: string | null;
}

export async function resolveEditionOwners(editionIds: string[]): Promise<Record<string, EditionOwner>> {
  const sb = getSupabaseServerAnon();
  if (!sb || editionIds.length === 0) return {};
  try {
    // Lowest currently-owned serial per edition.
    const lowest = await Promise.all(
      editionIds.map(async (id) => {
        const { data } = await sb
          .from("moments")
          .select("serial_number, owner_flow_address")
          .eq("edition_id", id)
          .not("owner_flow_address", "is", null)
          .order("serial_number", { ascending: true })
          .limit(1);
        const row = (data as { serial_number: number | null; owner_flow_address: string }[] | null)?.[0];
        return { id, serial: row?.serial_number ?? null, flow: row?.owner_flow_address ?? null };
      }),
    );

    const addrs = [...new Set(lowest.map((l) => l.flow).filter((a): a is string => !!a))];
    const nameByAddr = new Map<string, string>();
    if (addrs.length) {
      const { data: cols } = await sb.from("collectors").select("flow_address, username").in("flow_address", addrs).not("username", "is", null);
      for (const c of (cols as { flow_address: string; username: string }[] | null) ?? []) nameByAddr.set(c.flow_address, c.username);
    }

    const out: Record<string, EditionOwner> = {};
    for (const l of lowest) {
      out[l.id] = { serial: l.serial, flow_address: l.flow, username: l.flow ? nameByAddr.get(l.flow) ?? null : null };
    }
    return out;
  } catch (e) {
    console.error("[edition-owner] resolveEditionOwners threw", e);
    return {};
  }
}
