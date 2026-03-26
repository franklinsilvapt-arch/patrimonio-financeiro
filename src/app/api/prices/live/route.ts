import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { fetchLivePrices, type LivePrice } from '@/lib/prices/yahoo';
import { fetchLatestRates, convertCurrency } from '@/lib/currency/ecb';

export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Grandfather existing Plus subscribers on first access
  if (user?.plan === 'plus' && !user?.livePricesGranted) {
    await prisma.user.update({
      where: { id: userId },
      data: { livePricesGranted: true },
    });
  }

  const hasAccess = user?.livePricesGranted || user?.plan === 'plus';
  if (!hasAccess) {
    return NextResponse.json({ error: 'Plano Plus necessário' }, { status: 403 });
  }

  // Get latest holdings
  const holdings = await prisma.holding.findMany({
    where: { account: { userId } },
    include: { security: true, account: true },
  });

  // Deduplicate to latest per security+account
  const latestMap = new Map<string, typeof holdings[0]>();
  for (const h of holdings) {
    const key = `${h.securityId}_${h.accountId}`;
    if (!latestMap.has(key) || h.positionDate > latestMap.get(key)!.positionDate) {
      latestMap.set(key, h);
    }
  }
  const active = Array.from(latestMap.values());

  // Unique securities
  const securitiesMap = new Map<string, typeof active[0]>();
  for (const h of active) {
    if (!securitiesMap.has(h.securityId)) securitiesMap.set(h.securityId, h);
  }

  const securityRefs = Array.from(securitiesMap.values()).map((h) => ({
    id: h.securityId,
    isin: h.security.isin,
    ticker: h.security.ticker,
    exchange: h.security.exchange,
  }));

  const livePricesMap = await fetchLivePrices(securityRefs);

  // Compute live portfolio total in EUR
  let fxRates: Record<string, number> = {};
  try {
    const rateData = await fetchLatestRates();
    if (rateData?.rates) fxRates = rateData.rates;
  } catch {}

  const toEur = (amount: number, currency: string) => {
    if (currency === 'EUR' || !amount) return amount;
    return convertCurrency(amount, currency, 'EUR', fxRates);
  };

  // Group holdings by securityId for value calculation
  const holdingsBySecId = new Map<string, typeof active>();
  for (const h of active) {
    if (!holdingsBySecId.has(h.securityId)) holdingsBySecId.set(h.securityId, []);
    holdingsBySecId.get(h.securityId)!.push(h);
  }

  let liveTotal = 0;
  let liveDailyChangeEur = 0;
  let coveredValue = 0;
  let totalValue = 0;

  for (const [secId, hs] of holdingsBySecId) {
    const lp = livePricesMap.get(secId);
    for (const h of hs) {
      const storedEur = toEur(h.marketValue ?? 0, h.currency);
      totalValue += storedEur;
      if (lp) {
        const liveValueEur = toEur(lp.price * h.quantity, lp.currency);
        const changeEur = toEur(lp.dailyChange * h.quantity, lp.currency);
        liveTotal += liveValueEur;
        liveDailyChangeEur += changeEur;
        coveredValue += liveValueEur;
      } else {
        liveTotal += storedEur;
      }
    }
  }

  const liveDailyChangePct =
    liveTotal > 0 ? (liveDailyChangeEur / (liveTotal - liveDailyChangeEur)) * 100 : 0;

  // Serialise prices map
  const prices: Record<string, LivePrice | null> = {};
  for (const [secId, lp] of livePricesMap) {
    prices[secId] = lp;
  }

  return NextResponse.json({
    prices,
    liveTotal,
    liveDailyChangeEur,
    liveDailyChangePct,
    coveragePct: totalValue > 0 ? coveredValue / totalValue : 0,
    fetchedAt: new Date().toISOString(),
  });
}
