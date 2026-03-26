import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const scope = request.nextUrl.searchParams.get('scope'); // "personal", "business", or null (all)

    // Get all latest holdings
    const holdings = await prisma.holding.findMany({
      where: {
        account: {
          userId,
          ...(scope ? { accountType: scope } : {}),
        },
      },
      include: {
        security: {
          include: {
            countryExposures: { orderBy: { date: 'desc' } },
            sectorExposures: { orderBy: { date: 'desc' } },
            factorExposures: { orderBy: { date: 'desc' } },
          },
        },
        account: {
          include: { broker: true },
        },
      },
      orderBy: { positionDate: 'desc' },
    });

    // Deduplicate: keep most recent holding per security+account
    const latestHoldings = new Map<string, typeof holdings[0]>();
    for (const holding of holdings) {
      const key = `${holding.securityId}_${holding.accountId}`;
      const existing = latestHoldings.get(key);
      if (!existing || holding.positionDate > existing.positionDate) {
        latestHoldings.set(key, holding);
      }
    }

    const active = Array.from(latestHoldings.values());

    // Fetch exchange rates for currency conversion
    let fxRates: Record<string, number> = {};
    try {
      const { fetchLatestRates } = await import('@/lib/currency/ecb');
      const rateData = await fetchLatestRates();
      if (rateData?.rates) fxRates = rateData.rates;
    } catch {}

    // Helper: convert any currency to EUR
    const toEur = (amount: number, currency: string) => {
      if (currency === 'EUR' || !amount) return amount;
      const rate = fxRates[currency];
      if (!rate) return amount; // fallback: no conversion
      return amount / rate;
    };

    const totalValue = active.reduce((sum, h) => sum + toEur(h.marketValue || 0, h.currency), 0);

    // Aggregate by broker (in EUR)
    const byBroker: Record<string, number> = {};
    for (const h of active) {
      const name = h.account.broker.name;
      byBroker[name] = (byBroker[name] || 0) + toEur(h.marketValue || 0, h.currency);
    }

    // Aggregate by asset class (in EUR)
    const byAssetClass: Record<string, number> = {};
    for (const h of active) {
      const cls = h.security.assetClass;
      byAssetClass[cls] = (byAssetClass[cls] || 0) + toEur(h.marketValue || 0, h.currency);
    }

    // Aggregate country exposure (look-through)
    const byCountry: Record<string, number> = {};
    let countryCoverage = 0;
    let countryTotal = 0;
    for (const h of active) {
      const mv = toEur(h.marketValue || 0, h.currency);
      countryTotal += mv;
      if (h.security.countryExposures.length > 0) {
        const latestDate = h.security.countryExposures[0].date;
        const latestExposures = h.security.countryExposures.filter(
          (e) => e.date.getTime() === latestDate.getTime()
        );
        countryCoverage += mv * (latestExposures[0]?.coverage || 1);
        for (const e of latestExposures) {
          byCountry[e.countryName] = (byCountry[e.countryName] || 0) + mv * e.weight;
        }
      } else if (h.security.country) {
        byCountry[h.security.country] = (byCountry[h.security.country] || 0) + mv;
        countryCoverage += mv;
      }
    }

    // Aggregate sector exposure (look-through)
    const bySector: Record<string, number> = {};
    let sectorCoverage = 0;
    for (const h of active) {
      const mv = toEur(h.marketValue || 0, h.currency);
      if (h.security.sectorExposures.length > 0) {
        const latestDate = h.security.sectorExposures[0].date;
        const latestExposures = h.security.sectorExposures.filter(
          (e) => e.date.getTime() === latestDate.getTime()
        );
        sectorCoverage += mv * (latestExposures[0]?.coverage || 1);
        for (const e of latestExposures) {
          bySector[e.sector] = (bySector[e.sector] || 0) + mv * e.weight;
        }
      } else if (h.security.sector) {
        bySector[h.security.sector] = (bySector[h.security.sector] || 0) + mv;
        sectorCoverage += mv;
      }
    }

    // Aggregate factor exposure (weighted average)
    const factorScoresMap: Record<string, { totalScore: number; totalWeight: number }> = {};
    let factorCoverage = 0;
    for (const h of active) {
      const mv = toEur(h.marketValue || 0, h.currency);
      if (h.security.factorExposures.length > 0) {
        factorCoverage += mv;
        const latestDate = h.security.factorExposures[0].date;
        const latestFactors = h.security.factorExposures.filter(
          (e) => e.date.getTime() === latestDate.getTime()
        );
        for (const f of latestFactors) {
          if (!factorScoresMap[f.factor]) {
            factorScoresMap[f.factor] = { totalScore: 0, totalWeight: 0 };
          }
          factorScoresMap[f.factor].totalScore += f.score * mv;
          factorScoresMap[f.factor].totalWeight += mv;
        }
      }
    }

    // Unique counts
    const uniqueSecurities = new Set(active.map((h) => h.securityId)).size;
    const uniqueBrokers = new Set(active.map((h) => h.account.broker.slug)).size;

    const latestPositionDate = active.length > 0
      ? new Date(Math.max(...active.map((h) => h.positionDate.getTime())))
      : null;

    // Average coverage: country + sector (factor data is supplementary, not included)
    const cCov = countryTotal > 0 ? countryCoverage / countryTotal : 0;
    const sCov = countryTotal > 0 ? sectorCoverage / countryTotal : 0;
    const avgCoverage = countryTotal > 0 ? (cCov + sCov) / 2 : 0;

    // Build holdings list for the table
    const holdingsForTable = active.map((h) => {
      const hasFactors = h.security.factorExposures.length > 0;

      // Build per-holding country/sector exposures for client-side filtered charts
      let countryExposures: Array<{ countryName: string; weight: number }> = [];
      if (h.security.countryExposures.length > 0) {
        const latestDate = h.security.countryExposures[0].date;
        countryExposures = h.security.countryExposures
          .filter((e) => e.date.getTime() === latestDate.getTime())
          .map((e) => ({ countryName: e.countryName, weight: e.weight }));
      }

      let sectorExposures: Array<{ sector: string; weight: number }> = [];
      if (h.security.sectorExposures.length > 0) {
        const latestDate = h.security.sectorExposures[0].date;
        sectorExposures = h.security.sectorExposures
          .filter((e) => e.date.getTime() === latestDate.getTime())
          .map((e) => ({ sector: e.sector, weight: e.weight }));
      }

      return {
        securityId: h.securityId,
        securityName: h.security.name,
        ticker: h.security.ticker,
        isin: h.security.isin,
        broker: h.account.broker.name,
        accountType: h.account.accountType,
        quantity: h.quantity,
        price: h.priceAtPosition,
        currency: h.currency,
        marketValue: toEur(h.marketValue || 0, h.currency),
        marketValueOriginal: h.marketValue || 0,
        currencyOriginal: h.currency,
        weight: totalValue > 0 ? toEur(h.marketValue || 0, h.currency) / totalValue : 0,
        country: h.security.country,
        sector: h.security.sector,
        countryExposures,
        sectorExposures,
        factorCoverage: hasFactors ? (h.security.factorExposures[0]?.coverage ?? null) : null,
        positionDate: h.positionDate?.toISOString() ?? null,
        priceDate: h.priceDate?.toISOString() ?? null,
        source: h.priceSource,
        assetClass: h.security.assetClass,
      };
    });

    // Get historical snapshots for chart
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const history = snapshots
      .filter((s) =>
        scope === 'business' ? s.businessValue != null :
        scope === 'personal' ? s.personalValue != null :
        true
      )
      .map((s) => {
        const brokerData = s.brokerBreakdown ? JSON.parse(s.brokerBreakdown) : {};
        const value = scope === 'personal'
          ? (s.personalValue ?? s.totalValue)
          : scope === 'business'
            ? (s.businessValue ?? 0)
            : s.totalValue;
        return {
          date: s.date.toISOString().split('T')[0],
          value,
          ...brokerData,
        };
      });

    const brokerNames = Object.keys(byBroker);

    // Factor scores for radar chart (normalize to 0-1 range for display, original score as value)
    const factorScores = Object.entries(factorScoresMap).map(([factor, data]) => ({
      factor: factor.charAt(0).toUpperCase() + factor.slice(1),
      score: data.totalWeight > 0 ? data.totalScore / data.totalWeight : 0,
      fullMark: 1,
    }));

    return NextResponse.json({
      summary: {
        totalValue,
        currency: 'EUR',
        uniqueSecurities,
        brokerCount: uniqueBrokers,
        averageCoverage: avgCoverage,
        lastUpdate: latestPositionDate?.toISOString() ?? null,
        lastUpdateSource: 'broker_export',
      },
      holdings: holdingsForTable,
      brokerAllocation: Object.entries(byBroker).map(([name, value]) => ({ name, value })),
      countryExposure: Object.entries(byCountry)
        .map(([name, value]) => ({ name, value: totalValue > 0 ? value / totalValue : 0 }))
        .sort((a, b) => b.value - a.value),
      sectorExposure: Object.entries(bySector)
        .map(([name, value]) => ({ name, value: totalValue > 0 ? value / totalValue : 0 }))
        .sort((a, b) => b.value - a.value),
      assetClassAllocation: Object.entries(byAssetClass).map(([name, value]) => ({ name, value })),
      factorScores,
      history,
      brokerNames,
    });
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
