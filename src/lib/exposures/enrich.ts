// ---------------------------------------------------------------------------
// Security enrichment – fetch exposure data and store in DB
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db';
import { fetchJustETF } from './justetf';

export interface EnrichmentResult {
  securityId: string;
  isin: string;
  ticker: string | null;
  countriesAdded: number;
  sectorsAdded: number;
  source: string;
  error?: string;
}

/**
 * Enrich a single security with country & sector exposure data from JustETF.
 * Only works for securities with an ISIN (typically ETFs/Funds).
 */
export async function enrichSecurity(securityId: string): Promise<EnrichmentResult> {
  const security = await prisma.security.findUnique({
    where: { id: securityId },
    select: { id: true, isin: true, ticker: true, assetClass: true },
  });

  if (!security) {
    return { securityId, isin: '', ticker: null, countriesAdded: 0, sectorsAdded: 0, source: '', error: 'Security not found' };
  }

  if (!security.isin) {
    return { securityId, isin: '', ticker: security.ticker, countriesAdded: 0, sectorsAdded: 0, source: '', error: 'No ISIN available' };
  }

  if (security.assetClass !== 'ETF' && security.assetClass !== 'FUND') {
    return { securityId, isin: security.isin, ticker: security.ticker, countriesAdded: 0, sectorsAdded: 0, source: '', error: 'Not an ETF/Fund' };
  }

  try {
    const data = await fetchJustETF(security.isin);

    if (!data) {
      return { securityId, isin: security.isin, ticker: security.ticker, countriesAdded: 0, sectorsAdded: 0, source: 'justetf', error: 'No data returned from JustETF' };
    }

    // Delete old JustETF data for this security
    await prisma.countryExposure.deleteMany({
      where: { securityId, source: { startsWith: 'justetf' } },
    });
    await prisma.sectorExposure.deleteMany({
      where: { securityId, source: { startsWith: 'justetf' } },
    });

    // Coverage is 1.0 since the allocation sums to 100% (including "Other")
    const countryCoverage = 1.0;
    const sectorCoverage = 1.0;

    // Insert country exposures
    if (data.countries.length > 0) {
      await prisma.countryExposure.createMany({
        data: data.countries.map(c => ({
          securityId,
          country: c.country,
          countryName: c.countryName,
          weight: c.weight,
          date: data.referenceDate,
          source: data.source,
          confidence: 0.9,
          coverage: countryCoverage,
        })),
      });
    }

    // Insert sector exposures
    if (data.sectors.length > 0) {
      await prisma.sectorExposure.createMany({
        data: data.sectors.map(s => ({
          securityId,
          sector: s.sector,
          weight: s.weight,
          date: data.referenceDate,
          source: data.source,
          confidence: 0.9,
          coverage: sectorCoverage,
        })),
      });
    }

    return {
      securityId,
      isin: security.isin,
      ticker: security.ticker,
      countriesAdded: data.countries.length,
      sectorsAdded: data.sectors.length,
      source: data.source,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to enrich ${security.isin}:`, message);
    return { securityId, isin: security.isin, ticker: security.ticker, countriesAdded: 0, sectorsAdded: 0, source: 'justetf', error: message };
  }
}

/**
 * Enrich all ETFs/Funds in the portfolio that don't yet have exposure data.
 * Returns results for each security attempted.
 */
export async function enrichAllSecurities(forceRefresh = false): Promise<EnrichmentResult[]> {
  const securities = await prisma.security.findMany({
    where: {
      assetClass: { in: ['ETF', 'FUND'] },
      isin: { not: null },
    },
    select: {
      id: true,
      isin: true,
      ticker: true,
      _count: { select: { countryExposures: true } },
    },
  });

  const results: EnrichmentResult[] = [];

  for (const sec of securities) {
    // Skip if already has data (unless force refresh)
    if (!forceRefresh && sec._count.countryExposures > 0) {
      results.push({
        securityId: sec.id,
        isin: sec.isin!,
        ticker: sec.ticker,
        countriesAdded: 0,
        sectorsAdded: 0,
        source: 'skipped',
      });
      continue;
    }

    const result = await enrichSecurity(sec.id);
    results.push(result);

    // Rate limit: wait 1s between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
