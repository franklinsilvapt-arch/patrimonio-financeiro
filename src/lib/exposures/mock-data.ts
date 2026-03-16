// ---------------------------------------------------------------------------
// Mock exposure data for well-known ETFs
// ---------------------------------------------------------------------------

export interface MockCountryEntry {
  country: string;   // ISO 3166-1 alpha-2
  countryName: string;
  weight: number;    // 0.0 – 1.0
}

export interface MockSectorEntry {
  sector: string;
  weight: number;    // 0.0 – 1.0
}

export interface MockExposureData {
  countryExposures: MockCountryEntry[];
  sectorExposures: MockSectorEntry[];
  source: string;
  date: Date;
  confidence: number;
  coverage: number;
}

const MOCK_DATE = new Date('2024-06-30');
const MOCK_SOURCE = 'morningstar_manual_2024';
const MOCK_CONFIDENCE = 0.85;
const MOCK_COVERAGE = 0.95;

// ---------------------------------------------------------------------------
// VWCE - Vanguard FTSE All-World UCITS ETF
// ---------------------------------------------------------------------------

const VWCE_COUNTRY: MockCountryEntry[] = [
  { country: 'US', countryName: 'United States', weight: 0.60 },
  { country: 'JP', countryName: 'Japan', weight: 0.05 },
  { country: 'GB', countryName: 'United Kingdom', weight: 0.04 },
  { country: 'CN', countryName: 'China', weight: 0.03 },
  { country: 'FR', countryName: 'France', weight: 0.03 },
  { country: 'CA', countryName: 'Canada', weight: 0.03 },
  { country: 'CH', countryName: 'Switzerland', weight: 0.02 },
  { country: 'DE', countryName: 'Germany', weight: 0.02 },
  { country: 'AU', countryName: 'Australia', weight: 0.02 },
  { country: 'OTHER', countryName: 'Other', weight: 0.16 },
];

const VWCE_SECTOR: MockSectorEntry[] = [
  { sector: 'Technology', weight: 0.23 },
  { sector: 'Financials', weight: 0.16 },
  { sector: 'Healthcare', weight: 0.11 },
  { sector: 'Consumer Discretionary', weight: 0.11 },
  { sector: 'Industrials', weight: 0.10 },
  { sector: 'Consumer Staples', weight: 0.07 },
  { sector: 'Energy', weight: 0.05 },
  { sector: 'Telecommunication Services', weight: 0.04 },
  { sector: 'Utilities', weight: 0.03 },
  { sector: 'Materials', weight: 0.04 },
  { sector: 'Real Estate', weight: 0.03 },
  { sector: 'Other', weight: 0.03 },
];

// ---------------------------------------------------------------------------
// IWDA - iShares Core MSCI World UCITS ETF
// ---------------------------------------------------------------------------

const IWDA_COUNTRY: MockCountryEntry[] = [
  { country: 'US', countryName: 'United States', weight: 0.70 },
  { country: 'JP', countryName: 'Japan', weight: 0.05 },
  { country: 'GB', countryName: 'United Kingdom', weight: 0.04 },
  { country: 'FR', countryName: 'France', weight: 0.03 },
  { country: 'CA', countryName: 'Canada', weight: 0.03 },
  { country: 'CH', countryName: 'Switzerland', weight: 0.02 },
  { country: 'DE', countryName: 'Germany', weight: 0.02 },
  { country: 'AU', countryName: 'Australia', weight: 0.02 },
  { country: 'OTHER', countryName: 'Other', weight: 0.09 },
];

const IWDA_SECTOR: MockSectorEntry[] = [
  { sector: 'Technology', weight: 0.24 },
  { sector: 'Financials', weight: 0.15 },
  { sector: 'Healthcare', weight: 0.12 },
  { sector: 'Consumer Discretionary', weight: 0.11 },
  { sector: 'Industrials', weight: 0.10 },
  { sector: 'Consumer Staples', weight: 0.07 },
  { sector: 'Energy', weight: 0.05 },
  { sector: 'Telecommunication Services', weight: 0.04 },
  { sector: 'Utilities', weight: 0.03 },
  { sector: 'Materials', weight: 0.04 },
  { sector: 'Real Estate', weight: 0.03 },
  { sector: 'Other', weight: 0.02 },
];

// ---------------------------------------------------------------------------
// Lookup map (keyed by upper-cased ticker)
// ---------------------------------------------------------------------------

export const MOCK_ETF_EXPOSURES: Record<string, MockExposureData> = {
  VWCE: {
    countryExposures: VWCE_COUNTRY,
    sectorExposures: VWCE_SECTOR,
    source: MOCK_SOURCE,
    date: MOCK_DATE,
    confidence: MOCK_CONFIDENCE,
    coverage: MOCK_COVERAGE,
  },
  IWDA: {
    countryExposures: IWDA_COUNTRY,
    sectorExposures: IWDA_SECTOR,
    source: MOCK_SOURCE,
    date: MOCK_DATE,
    confidence: MOCK_CONFIDENCE,
    coverage: MOCK_COVERAGE,
  },
};

/**
 * Look up mock exposure data for a ticker (case-insensitive).
 * Returns undefined if no mock data exists.
 */
export function getMockExposure(ticker: string): MockExposureData | undefined {
  return MOCK_ETF_EXPOSURES[ticker.toUpperCase()];
}

// ---------------------------------------------------------------------------
// Currency -> country mapping for CASH positions
// ---------------------------------------------------------------------------

export const CURRENCY_COUNTRY_MAP: Record<string, { country: string; countryName: string }> = {
  EUR: { country: 'EU', countryName: 'Eurozone' },
  USD: { country: 'US', countryName: 'United States' },
  GBP: { country: 'GB', countryName: 'United Kingdom' },
  CHF: { country: 'CH', countryName: 'Switzerland' },
  JPY: { country: 'JP', countryName: 'Japan' },
  CAD: { country: 'CA', countryName: 'Canada' },
  AUD: { country: 'AU', countryName: 'Australia' },
  SEK: { country: 'SE', countryName: 'Sweden' },
  NOK: { country: 'NO', countryName: 'Norway' },
  DKK: { country: 'DK', countryName: 'Denmark' },
  HKD: { country: 'HK', countryName: 'Hong Kong' },
  SGD: { country: 'SG', countryName: 'Singapore' },
  CNY: { country: 'CN', countryName: 'China' },
};
