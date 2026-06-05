// OwnerCredit — the named, proud-making human behind an edition highlight:
// "#1 held by @username", the @ deep-linking to their bag. Pointer-events are
// scoped so it works inside an image overlay that has a full-card link beneath
// (the @username stays clickable; everything else falls through to the card).

import Link from "next/link";

export function OwnerCredit({
  serial, username, flow, tone = "dark", big,
}: {
  serial: number | null; username: string | null; flow: string | null;
  tone?: "dark" | "image"; big?: boolean;
}) {
  if (!username && !flow) return null;
  const muted = tone === "image" ? "text-white/45" : "text-[var(--text-faint)]";
  const size = big ? "text-[12px]" : "text-[10px]";
  const label = serial != null ? `#${serial} held by` : "held by";
  return (
    <div className={`pointer-events-none mt-1 flex items-center gap-1 font-mono ${size}`}>
      <span className={muted}>{label}</span>
      {username ? (
        <Link href={`/u/${encodeURIComponent(username)}`} className="pointer-events-auto relative z-20 font-semibold text-[var(--accent)] hover:underline">
          @{username}
        </Link>
      ) : (
        <span className={muted}>{flow!.slice(0, 6)}…{flow!.slice(-4)}</span>
      )}
    </div>
  );
}
