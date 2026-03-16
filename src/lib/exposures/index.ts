// ---------------------------------------------------------------------------
// Exposure calculation (country & sector)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db';
import type { AssetClassType } from '@/lib/types';
import { getMockExposure, CURRENCY_COUNTRY_MAP } from './mock-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountryExposureEntry {
  country: string;      // ISO code
  countryName: string;
  weight: number;        // 0.0 – 1.0
}

export interface SectorExposureEntry {
  sector: string;
  weight: number;        // 0.0 – 1.0
}

export interface ExposureResult {
  countryExposures: CountryExposureEntry[];
  sectorExposures: SectorExposureEntry[];
  source: string;
  confidence: number;
  coverage: number;
}

export interface HoldingWithExposure {
  securityId: string;
  ticker: string | null;
  assetClass: AssetClassType;
  currency: string;
  marketValue: number;
  country: string | null;       // from Security record
  countryName?: string | null;
  sector: string | null;        // from Security record
  exposure?: ExposureResult;
}

export interface AggregatedExposure {
  countryExposures: CountryExposureEntry[];
  sectorExposures: SectorExposureEntry[];
  coveragePercent: number;      // 0.0 – 1.0, what % of portfolio has data
}

// ---------------------------------------------------------------------------
// Country exposure for a single security
// ---------------------------------------------------------------------------

/**
 * Get country exposure breakdown for a security.
 *
 * - Individual equities: single country from the security record
 * - ETFs: stored breakdown from DB or mock data
 * - CASH: currency's home country
 */
export async function getCountryExposure(
  securityId: string,
  assetClass: AssetClassType,
  holdingData: {
    ticker: string | null;
    currency: string;
    country: string | null;
    countryName?: string | null;
  },
): Promise<CountryExposureEntry[]> {
  // --- CASH ---
  if (assetClass === 'CASH') {
    const mapped = CURRENCY_COUNTRY_MAP[holdingData.currency.toUpperCase()];
    if (mapped) {
      return [{ country: mapped.country, countryName: mapped.countryName, weight: 1.0 }];
    }
    return [{ country: 'OTHER', countryName: holdingData.currency, weight: 1.0 }];
  }

  // --- ETF / FUND: check DB first, then mock data ---
  if (assetClass === 'ETF' || assetClass === 'FUND') {
    // Try stored data
    const dbExposures = await prisma.countryExposure.findMany({
      where: { securityId },
      orderBy: { date: 'desc' },
    });

    if (dbExposures.length > 0) {
      // Use the most recent set (all rows sharing the latest date)
      const latestDate = dbExposures[0].date.getTime();
      return dbExposures
        .filter((e) => e.date.getTime() === latestDate)
        .map((e) => ({
          country: e.country,
          countryName: e.countryName,
          weight: e.weight,
        }));
    }

    // Fall back to mock data
    if (holdingData.ticker) {
      const mock = getMockExposure(holdingData.ticker);
      if (mock) {
        return mock.countryExposures.map((e) => ({
          country: e.country,
          countryName: e.countryName,
          weight: e.weight,
        }));
      }
    }
  }

  // --- Individual EQUITY / BOND / etc.: single country ---
  if (holdingData.country) {
    return [
      {
        country: holdingData.country,
        countryName: holdingData.countryName ?? holdingData.country,
        weight: 1.0,
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Sector exposure for a single security
// ---------------------------------------------------------------------------

/**
 * Get sector exposure breakdown for a security.
 *
 * - Individual equities: single sector from the security record
 * - ETFs: stored breakdown from DB or mock data
 * - CASH: sector "Cash"
 */
export async function getSectorExposure(
  securityId: string,
  assetClass: AssetClassType,
  holdingData: {
    ticker: string | null;
    sector: string | null;
  },
): Promise<SectorExposureEntry[]> {
  // --- CASH ---
  if (assetClass === 'CASH') {
    return [{ sector: 'Cash', weight: 1.0 }];
  }

  // --- ETF / FUND: check DB first, then mock data ---
  if (assetClass === 'ETF' || assetClass === 'FUND') {
    const dbExposures = await prisma.sectorExposure.findMany({
      where: { securityId },
      orderBy: { date: 'desc' },
    });

    if (dbExposures.length > 0) {
      const latestDate = dbExposures[0].date.getTime();
      return dbExposures
        .filter((e) => e.date.getTime() === latestDate)
        .map((e) => ({
          sector: e.sector,
          weight: e.weight,
        }));
    }

    // Fall back to mock data
    if (holdingData.ticker) {
      const mock = getMockExposure(holdingData.ticker);
      if (mock) {
        return mock.sectorExposures.map((e) => ({
          sector: e.sector,
          weight: e.weight,
        }));
      }
    }
  }

  // --- Individual EQUITY / BOND / etc.: single sector ---
  if (holdingData.sector) {
    return [{ sector: holdingData.sector, weight: 1.0 }];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Aggregate exposures across all holdings
// ---------------------------------------------------------------------------

/**
 * Aggregate country and sector exposures across a portfolio,
 * weighted by each holding's market value.
 */
export function aggregateExposures(
  holdings: HoldingWithExposure[],
): AggregatedExposure {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  if (totalValue === 0) {
    return { countryExposures: [], sectorExposures: [], coveragePercent: 0 };
  }

  const countryMap = new Map<string, { countryName: string; weight: number }>();
  const sectorMap = new Map<string, number>();

  let coveredValue = 0;

  for (const holding of holdings) {
    const holdingWeight = holding.marketValue / totalValue;
    const exp = holding.exposure;

    if (!exp) continue;

    const hasData =
      exp.countryExposures.length > 0 || exp.sectorExposures.length > 0;
    if (hasData) {
      coveredValue += holding.marketValue;
    }

    // Aggregate country
    for (const ce of exp.countryExposures) {
      const existing = countryMap.get(ce.country);
      const contribution = ce.weight * holdingWeight;
      if (existing) {
        existing.weight += contribution;
      } else {
        countryMap.set(ce.country, {
          countryName: ce.countryName,
          weight: contribution,
        });
      }
    }

    // Aggregate sector
    for (const se of exp.sectorExposures) {
      const existing = sectorMap.get(se.sector) ?? 0;
      sectorMap.set(se.sector, existing + se.weight * holdingWeight);
    }
  }

  // Convert maps to sorted arrays
  const countryExposures: CountryExposureEntry[] = Array.from(countryMap.entries())
    .map(([country, { countryName, weight }]) => ({ country, countryName, weight }))
    .sort((a, b) => b.weight - a.weight);

  const sectorExposures: SectorExposureEntry[] = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);

  const coveragePercent = totalValue > 0 ? coveredValue / totalValue : 0;

  return { countryExposures, sectorExposures, coveragePercent };
}

// ---------------------------------------------------------------------------
// Coverage helper
// ---------------------------------------------------------------------------

/**
 * Calculate what percentage of a portfolio (by market value) has exposure data.
 */
export function calculateExposureCoverage(
  holdings: HoldingWithExposure[],
): number {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  if (totalValue === 0) return 0;

  const coveredValue = holdings
    .filter(
      (h) =>
        h.exposure &&
        (h.exposure.countryExposures.length > 0 ||
          h.exposure.sectorExposures.length > 0),
    )
    .reduce((sum, h) => sum + h.marketValue, 0);

  return coveredValue / totalValue;
}
