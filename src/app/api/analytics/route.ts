import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Country → primary currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  'United States': 'USD', 'USA': 'USD', 'US': 'USD',
  'Japan': 'JPY', 'United Kingdom': 'GBP', 'UK': 'GBP',
  'Switzerland': 'CHF', 'Canada': 'CAD', 'Australia': 'AUD',
  'China': 'CNY', 'Hong Kong': 'HKD', 'South Korea': 'KRW',
  'Taiwan': 'TWD', 'India': 'INR', 'Brazil': 'BRL',
  'Sweden': 'SEK', 'Denmark': 'DKK', 'Norway': 'NOK',
  'Singapore': 'SGD', 'Mexico': 'MXN', 'South Africa': 'ZAR',
  'Indonesia': 'IDR', 'Thailand': 'THB', 'Malaysia': 'MYR',
  'Philippines': 'PHP', 'Poland': 'PLN', 'Turkey': 'TRY',
  'Czech Republic': 'CZK', 'Hungary': 'HUF', 'Israel': 'ILS',
  'New Zealand': 'NZD', 'Chile': 'CLP', 'Colombia': 'COP',
  // Eurozone countries → EUR
  'Germany': 'EUR', 'France': 'EUR', 'Netherlands': 'EUR',
  'Italy': 'EUR', 'Spain': 'EUR', 'Belgium': 'EUR',
  'Austria': 'EUR', 'Finland': 'EUR', 'Ireland': 'EUR',
  'Portugal': 'EUR', 'Greece': 'EUR', 'Luxembourg': 'EUR',
  'Estonia': 'EUR', 'Latvia': 'EUR', 'Lithuania': 'EUR',
  'Slovakia': 'EUR', 'Slovenia': 'EUR', 'Malta': 'EUR',
  'Cyprus': 'EUR', 'Croatia': 'EUR',
  // Other/generic
  'Other': 'EUR', 'Outros': 'EUR',
};

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope');

    const holdings = await prisma.holding.findMany({
      where: scope ? { account: { accountType: scope } } : undefined,
      include: {
        security: {
          include: {
            countryExposures: { orderBy: { date: 'desc' } },
          },
        },
        account: { include: { broker: true } },
      },
      orderBy: { positionDate: 'desc' },
    });

    // Deduplicate: latest per security+account
    const latestHoldings = new Map<string, typeof holdings[0]>();
    for (const h of holdings) {
      const key = `${h.securityId}_${h.accountId}`;
      if (!latestHoldings.has(key) || h.positionDate > latestHoldings.get(key)!.positionDate) {
        latestHoldings.set(key, h);
      }
    }
    const active = Array.from(latestHoldings.values());
    const totalValue = active.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // -----------------------------------------------------------------------
    // 1) HHI — Herfindahl-Hirschman Index by position
    // -----------------------------------------------------------------------
    // HHI = sum of (weight_i)^2 where weight_i is the fraction of portfolio
    // HHI range: 1/N (perfectly diversified) to 1 (single position)
    // We compute by asset, by broker, and by sector (via country exposure)
    const positionWeights: Array<{ name: string; weight: number }> = [];
    for (const h of active) {
      const w = totalValue > 0 ? (h.marketValue || 0) / totalValue : 0;
      positionWeights.push({ name: h.security.ticker || h.security.name, weight: w });
    }
    const hhiByPosition = positionWeights.reduce((sum, p) => sum + p.weight ** 2, 0);

    const brokerWeights: Record<string, number> = {};
    for (const h of active) {
      const name = h.account.broker.name;
      brokerWeights[name] = (brokerWeights[name] || 0) + (totalValue > 0 ? (h.marketValue || 0) / totalValue : 0);
    }
    const hhiByBroker = Object.values(brokerWeights).reduce((sum, w) => sum + w ** 2, 0);

    // Effective number of positions = 1 / HHI
    const effectivePositions = hhiByPosition > 0 ? 1 / hhiByPosition : 0;
    const effectiveBrokers = hhiByBroker > 0 ? 1 / hhiByBroker : 0;

    // Top positions by weight for the chart
    const topPositions = [...positionWeights]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // -----------------------------------------------------------------------
    // 2) Real currency exposure (look-through via country exposure)
    // -----------------------------------------------------------------------
    const currencyExposure: Record<string, number> = {};

    for (const h of active) {
      const mv = h.marketValue || 0;

      if (h.security.assetClass === 'CASH') {
        // Cash: use the holding's currency directly
        const cur = h.currency || 'EUR';
        currencyExposure[cur] = (currencyExposure[cur] || 0) + mv;
      } else if (h.security.countryExposures.length > 0) {
        // Look-through: map country exposures to currencies
        const latestDate = h.security.countryExposures[0].date;
        const latestExposures = h.security.countryExposures.filter(
          (e) => e.date.getTime() === latestDate.getTime()
        );
        for (const e of latestExposures) {
          const cur = COUNTRY_CURRENCY[e.countryName] || 'EUR';
          currencyExposure[cur] = (currencyExposure[cur] || 0) + mv * e.weight;
        }
      } else {
        // Fallback: use security domicile or holding currency
        const cur = h.security.country
          ? (COUNTRY_CURRENCY[h.security.country] || h.currency || 'EUR')
          : (h.currency || 'EUR');
        currencyExposure[cur] = (currencyExposure[cur] || 0) + mv;
      }
    }

    // Convert to percentages
    const currencyExposurePct = Object.entries(currencyExposure)
      .map(([name, value]) => ({ name, value: totalValue > 0 ? value / totalValue : 0 }))
      .sort((a, b) => b.value - a.value);

    // -----------------------------------------------------------------------
    // 3) Correlation matrix between assets
    // -----------------------------------------------------------------------
    // Use price snapshots if available, otherwise use snapshot-based returns
    const securities = active.map((h) => ({
      id: h.securityId,
      label: h.security.ticker || h.security.name,
      weight: totalValue > 0 ? (h.marketValue || 0) / totalValue : 0,
    }));

    // Fetch price snapshots for correlation
    const securityIds = securities.map((s) => s.id);
    const priceSnapshots = await prisma.priceSnapshot.findMany({
      where: { securityId: { in: securityIds } },
      orderBy: { date: 'asc' },
    });

    // Group by security, calculate returns
    const pricesBySecurity: Record<string, Array<{ date: string; price: number }>> = {};
    for (const ps of priceSnapshots) {
      const dateStr = ps.date.toISOString().split('T')[0];
      if (!pricesBySecurity[ps.securityId]) pricesBySecurity[ps.securityId] = [];
      pricesBySecurity[ps.securityId].push({ date: dateStr, price: ps.price });
    }

    // Calculate returns per security
    const returnsBySecurity: Record<string, Record<string, number>> = {};
    for (const [secId, prices] of Object.entries(pricesBySecurity)) {
      returnsBySecurity[secId] = {};
      for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1].price > 0) {
          returnsBySecurity[secId][prices[i].date] =
            (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
        }
      }
    }

    // Build correlation matrix for securities with price data
    const secWithPrices = securities.filter((s) => returnsBySecurity[s.id] && Object.keys(returnsBySecurity[s.id]).length >= 2);
    const correlationMatrix: Array<{
      asset1: string;
      asset2: string;
      correlation: number;
    }> = [];

    for (let i = 0; i < secWithPrices.length; i++) {
      for (let j = i; j < secWithPrices.length; j++) {
        const r1 = returnsBySecurity[secWithPrices[i].id];
        const r2 = returnsBySecurity[secWithPrices[j].id];
        // Find common dates
        const commonDates = Object.keys(r1).filter((d) => d in r2);
        if (commonDates.length < 2) {
          correlationMatrix.push({
            asset1: secWithPrices[i].label,
            asset2: secWithPrices[j].label,
            correlation: i === j ? 1 : 0,
          });
          continue;
        }
        const vals1 = commonDates.map((d) => r1[d]);
        const vals2 = commonDates.map((d) => r2[d]);
        const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
        const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
        let cov = 0, var1 = 0, var2 = 0;
        for (let k = 0; k < commonDates.length; k++) {
          const d1 = vals1[k] - mean1;
          const d2 = vals2[k] - mean2;
          cov += d1 * d2;
          var1 += d1 * d1;
          var2 += d2 * d2;
        }
        const denom = Math.sqrt(var1 * var2);
        correlationMatrix.push({
          asset1: secWithPrices[i].label,
          asset2: secWithPrices[j].label,
          correlation: denom > 0 ? cov / denom : (i === j ? 1 : 0),
        });
      }
    }

    return NextResponse.json({
      concentration: {
        hhiByPosition,
        hhiByBroker,
        effectivePositions: Math.round(effectivePositions * 10) / 10,
        effectiveBrokers: Math.round(effectiveBrokers * 10) / 10,
        topPositions,
        positionCount: active.length,
      },
      currencyExposure: currencyExposurePct,
      correlation: {
        assets: secWithPrices.map((s) => s.label),
        matrix: correlationMatrix,
      },
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
