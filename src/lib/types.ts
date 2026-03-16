// ---------------------------------------------------------------------------
// Broker
// ---------------------------------------------------------------------------

export type BrokerSlug = 'degiro' | 'ibkr' | 'lightyear' | 'trading212';

// ---------------------------------------------------------------------------
// Asset class (mirrors Prisma enum)
// ---------------------------------------------------------------------------

export type AssetClassType =
  | 'EQUITY'
  | 'ETF'
  | 'BOND'
  | 'FUND'
  | 'CASH'
  | 'CRYPTO'
  | 'COMMODITY'
  | 'OTHER';

// ---------------------------------------------------------------------------
// Import pipeline
// ---------------------------------------------------------------------------

/** Result of parsing + normalizing a single row from a broker CSV. */
export interface ImportResult {
  securityName: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  price: number | null;
  marketValue: number | null;
  currency: string;
  positionDate: Date;
  errors: string[];
  warnings: string[];
}

/** Raw fields extracted from a broker CSV row before normalization. */
export interface ParsedImportRow {
  securityName: string | null;
  ticker: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  marketValue: number | null;
  currency: string | null;
  exchange: string | null;
  assetClass: string | null;
  positionDate: Date | null;
  averageCost: number | null;
  /** Original row index in the source file (for error reporting). */
  sourceRowIndex: number;
  /** Unparsed fields preserved for debugging. */
  rawFields: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Security normalization / matching
// ---------------------------------------------------------------------------

export type MatchType = 'isin' | 'ticker_exchange' | 'name' | 'new';

export interface NormalizationResult {
  matchedSecurityId: string;
  matchType: MatchType;
  /** 0.0 – 1.0 confidence in the match. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Dashboard / aggregation
// ---------------------------------------------------------------------------

/** A single holding aggregated across brokers for the dashboard. */
export interface AggregatedHolding {
  securityId: string;
  securityName: string;
  ticker: string | null;
  isin: string | null;
  assetClass: AssetClassType;
  currency: string;
  totalQuantity: number;
  totalMarketValue: number;
  /** Per-broker breakdown: broker slug -> quantity. */
  quantityByBroker: Record<BrokerSlug, number>;
  /** Per-broker breakdown: broker slug -> market value. */
  marketValueByBroker: Record<BrokerSlug, number>;
  /** Weight of this holding within the total portfolio (0.0 – 1.0). */
  weight: number;
  pricePerUnit: number | null;
  priceDate: DateInfo | null;
}

// ---------------------------------------------------------------------------
// Exposure breakdowns
// ---------------------------------------------------------------------------

export interface ExposureBreakdown {
  /** Label for the slice (country code, sector name, etc.). */
  label: string;
  /** Weight of this slice (0.0 – 1.0). */
  weight: number;
  /** Where the data came from. */
  source: string;
  /** Date of the breakdown data. */
  date: Date;
  /** Confidence in the weight (0.0 – 1.0). */
  confidence: number;
  /** Fraction of the underlying fund/security covered by this data (0.0 – 1.0). */
  coverage: number;
}

// ---------------------------------------------------------------------------
// Factor scores
// ---------------------------------------------------------------------------

export interface FactorScore {
  /** Factor name, e.g. "value", "momentum", "quality". */
  factor: string;
  /** Normalized score (typically -1.0 to 1.0). */
  score: number;
  /** Calculation methodology. */
  method: string;
  /** Date of the score. */
  date: Date;
  /** Data source. */
  source: string;
  /** Confidence in the score (0.0 – 1.0). */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Portfolio summary
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  totalValue: number;
  currency: string;
  /** Total value per broker slug. */
  byBroker: Record<BrokerSlug, number>;
  /** Total value per asset class. */
  byAssetClass: Record<AssetClassType, number>;
  /** Weighted country exposure across the portfolio. */
  byCountry: Record<string, ExposureBreakdown>;
  /** Weighted sector exposure across the portfolio. */
  bySector: Record<string, ExposureBreakdown>;
  /** Aggregate factor scores for the portfolio. */
  byFactor: Record<string, FactorScore>;
  /** When the summary was computed. */
  asOfDate: DateInfo;
}

// ---------------------------------------------------------------------------
// Date transparency
// ---------------------------------------------------------------------------

/** Metadata about a date value so the UI can show where it came from. */
export interface DateInfo {
  date: Date;
  /** Origin of this date, e.g. "broker_export", "api_yahoo", "manual". */
  source: string;
  /** Human-readable label, e.g. "Position date from DEGIRO export". */
  label: string;
}
