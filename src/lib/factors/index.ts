// ---------------------------------------------------------------------------
// Factor exposure system
// ---------------------------------------------------------------------------

import type { AssetClassType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FactorType =
  | 'value'
  | 'size'
  | 'momentum'
  | 'quality'
  | 'volatility'
  | 'growth';

export const ALL_FACTORS: FactorType[] = [
  'value',
  'size',
  'momentum',
  'quality',
  'volatility',
  'growth',
];

export interface FactorExposureEntry {
  factor: FactorType;
  /** Normalized score from -1.0 to 1.0 */
  score: number;
  method: string;
  confidence: number;
  source: string;
}

export interface HoldingWithFactors {
  securityId: string;
  ticker: string | null;
  assetClass: AssetClassType;
  marketValue: number;
  factors: FactorExposureEntry[];
}

export interface AggregatedFactors {
  factors: FactorExposureEntry[];
  coveragePercent: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHOD = 'mock_fundamental_scoring_v1';
const SOURCE = 'portfolio_aggregator_mock';
const DEFAULT_CONFIDENCE = 0.5;

// ---------------------------------------------------------------------------
// Mock factor data for known tickers
// ---------------------------------------------------------------------------

type FactorScores = Record<FactorType, number>;

const MOCK_FACTOR_DATA: Record<string, { scores: FactorScores; confidence: number }> = {
  // Large-cap tech
  MSFT: {
    scores: { value: -0.3, size: 1.0, momentum: 0.6, quality: 0.9, volatility: -0.2, growth: 0.7 },
    confidence: 0.6,
  },
  AAPL: {
    scores: { value: -0.2, size: 1.0, momentum: 0.5, quality: 0.9, volatility: -0.3, growth: 0.6 },
    confidence: 0.6,
  },
  GOOGL: {
    scores: { value: 0.0, size: 1.0, momentum: 0.3, quality: 0.8, volatility: -0.1, growth: 0.5 },
    confidence: 0.6,
  },
  AMZN: {
    scores: { value: -0.4, size: 1.0, momentum: 0.4, quality: 0.7, volatility: 0.1, growth: 0.8 },
    confidence: 0.6,
  },
  // European equities
  NESN: {
    scores: { value: 0.4, size: 0.8, momentum: -0.1, quality: 0.7, volatility: -0.5, growth: 0.1 },
    confidence: 0.6,
  },
  'NESTLE': {
    scores: { value: 0.4, size: 0.8, momentum: -0.1, quality: 0.7, volatility: -0.5, growth: 0.1 },
    confidence: 0.6,
  },
  ASML: {
    scores: { value: -0.2, size: 0.9, momentum: 0.5, quality: 0.8, volatility: 0.2, growth: 0.7 },
    confidence: 0.6,
  },
  MC: {
    scores: { value: -0.1, size: 0.9, momentum: 0.1, quality: 0.8, volatility: -0.1, growth: 0.4 },
    confidence: 0.6,
  },
  // Broad market ETFs
  VWCE: {
    scores: { value: 0.0, size: 0.3, momentum: 0.2, quality: 0.3, volatility: 0.0, growth: 0.2 },
    confidence: 0.7,
  },
  IWDA: {
    scores: { value: 0.0, size: 0.3, momentum: 0.2, quality: 0.3, volatility: 0.0, growth: 0.2 },
    confidence: 0.7,
  },
  VUSA: {
    scores: { value: -0.1, size: 0.4, momentum: 0.3, quality: 0.4, volatility: -0.1, growth: 0.3 },
    confidence: 0.7,
  },
  CSPX: {
    scores: { value: -0.1, size: 0.4, momentum: 0.3, quality: 0.4, volatility: -0.1, growth: 0.3 },
    confidence: 0.7,
  },
  // Value / emerging market ETFs
  VFEM: {
    scores: { value: 0.3, size: 0.1, momentum: -0.1, quality: 0.0, volatility: 0.3, growth: 0.1 },
    confidence: 0.6,
  },
  IEMM: {
    scores: { value: 0.3, size: 0.1, momentum: -0.1, quality: 0.0, volatility: 0.3, growth: 0.1 },
    confidence: 0.6,
  },
};

// ---------------------------------------------------------------------------
// Get factor exposures for a single security
// ---------------------------------------------------------------------------

/**
 * Get factor exposures for a security.
 *
 * For known tickers, returns mock factor scores.
 * For unknown tickers, returns an empty array.
 */
export async function getFactorExposures(
  securityId: string,
  assetClass: AssetClassType,
  ticker: string | null,
): Promise<FactorExposureEntry[]> {
  // CASH has no meaningful factor exposure
  if (assetClass === 'CASH') {
    return ALL_FACTORS.map((factor) => ({
      factor,
      score: 0,
      method: METHOD,
      confidence: 1.0,
      source: SOURCE,
    }));
  }

  // Look up mock data by ticker
  if (ticker) {
    const key = ticker.toUpperCase();
    const mockData = MOCK_FACTOR_DATA[key];

    if (mockData) {
      return ALL_FACTORS.map((factor) => ({
        factor,
        score: mockData.scores[factor],
        method: METHOD,
        confidence: mockData.confidence,
        source: SOURCE,
      }));
    }
  }

  // Unknown security - no factor data available
  return [];
}

// ---------------------------------------------------------------------------
// Aggregate factor scores across holdings
// ---------------------------------------------------------------------------

/**
 * Aggregate factor scores across a portfolio, weighted by market value.
 *
 * Holdings without factor data are excluded from the aggregation but
 * counted toward coverage.
 */
export function aggregateFactors(
  holdings: HoldingWithFactors[],
): AggregatedFactors {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  if (totalValue === 0) {
    return { factors: [], coveragePercent: 0 };
  }

  // Only include holdings that have factor data
  const holdingsWithData = holdings.filter((h) => h.factors.length > 0);
  const coveredValue = holdingsWithData.reduce((sum, h) => sum + h.marketValue, 0);

  if (holdingsWithData.length === 0) {
    return { factors: [], coveragePercent: 0 };
  }

  // Aggregate each factor
  const factorSums = new Map<FactorType, { weightedScore: number; weightedConfidence: number; totalWeight: number }>();

  for (const factor of ALL_FACTORS) {
    factorSums.set(factor, { weightedScore: 0, weightedConfidence: 0, totalWeight: 0 });
  }

  for (const holding of holdingsWithData) {
    const holdingWeight = holding.marketValue / totalValue;

    for (const fe of holding.factors) {
      const entry = factorSums.get(fe.factor);
      if (entry) {
        entry.weightedScore += fe.score * holdingWeight;
        entry.weightedConfidence += fe.confidence * holdingWeight;
        entry.totalWeight += holdingWeight;
      }
    }
  }

  const factors: FactorExposureEntry[] = ALL_FACTORS
    .map((factor) => {
      const entry = factorSums.get(factor)!;
      if (entry.totalWeight === 0) {
        return null;
      }
      return {
        factor,
        score: Math.round(entry.weightedScore * 1000) / 1000, // 3 decimal places
        method: METHOD,
        confidence: Math.round((entry.weightedConfidence / entry.totalWeight) * 100) / 100,
        source: SOURCE,
      };
    })
    .filter((f): f is FactorExposureEntry => f !== null);

  return {
    factors,
    coveragePercent: coveredValue / totalValue,
  };
}
