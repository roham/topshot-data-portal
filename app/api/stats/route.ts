import { recentSalesBulk, biggestSalesAllTime } from "@/lib/topshot/queries";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const [recent, allTime] = await Promise.all([recentSalesBulk(100), biggestSalesAllTime(5)]);
  const totalVol = recent.reduce((s, t) => s + Number(t.price ?? 0), 0);
  const buyerSpend = new Map<string, number>();
  const playerVol = new Map<string, number>();
  for (const t of recent) {
    const p = Number(t.price ?? 0);
    if (t.buyer?.username) buyerSpend.set(t.buyer.username, (buyerSpend.get(t.buyer.username) ?? 0) + p);
    const pl = t.moment?.play?.stats?.playerName;
    if (pl) playerVol.set(pl, (playerVol.get(pl) ?? 0) + p);
  }
  const topBuyer = [...buyerSpend.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPlayer = [...playerVol.entries()].sort((a, b) => b[1] - a[1])[0];
  return Response.json({
    generatedAt: new Date().toISOString(),
    window: { saleCount: recent.length, totalVolumeUsd: totalVol, sampledAt: new Date().toISOString() },
    topBuyerInWindow: topBuyer ? { username: topBuyer[0], spentUsd: topBuyer[1] } : null,
    topPlayerInWindow: topPlayer ? { name: topPlayer[0], volumeUsd: topPlayer[1] } : null,
    allTimeTopSales: allTime.map((t) => ({
      priceUsd: Number(t.price),
      player: t.moment?.play?.stats?.playerName,
      set: t.moment?.set?.flowName,
      serial: t.moment?.flowSerialNumber,
      circulation: t.moment?.edition?.circulationCount,
      tier: t.moment?.tier,
      txHash: t.txHash,
      buyer: t.buyer?.username,
      seller: t.seller?.username,
    })),
  });
}
