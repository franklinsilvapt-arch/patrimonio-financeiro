// ---------------------------------------------------------------------------
// Static exposure data for Portuguese PPR funds
// Source: fund management company websites
// Last updated: 2025-12-31 (allocation date from Casa de Investimentos)
// ---------------------------------------------------------------------------

export interface PPRFundData {
  name: string;
  isins: string[];
  referenceDate: Date;
  source: string;
  countries: Array<{ country: string; countryName: string; weight: number }>;
  sectors: Array<{ sector: string; weight: number }>;
}

// ISO country code mapping for fund allocations
const COUNTRY_MAP: Record<string, string> = {
  'EUA': 'US',
  'França': 'FR',
  'China': 'CN',
  'Espanha': 'ES',
  'Alemanha': 'DE',
  'Itália': 'IT',
  'Irlanda': 'IE',
  'Reino Unido': 'GB',
  'Japão': 'JP',
  'Suíça': 'CH',
  'Canadá': 'CA',
  'Países Baixos': 'NL',
  'Austrália': 'AU',
  'Coreia do Sul': 'KR',
  'Índia': 'IN',
  'Brasil': 'BR',
  'Portugal': 'PT',
};

const PPR_FUNDS: PPRFundData[] = [
  {
    name: 'Save & Grow PPR',
    isins: ['PTCUUBHM0004', 'PTCUUAHM0005'], // Founders + Prime
    referenceDate: new Date('2025-12-31'),
    source: 'casadeinvestimentos_manual',
    countries: [
      { country: 'US', countryName: 'EUA', weight: 0.6789 },
      { country: 'FR', countryName: 'França', weight: 0.1109 },
      { country: 'CN', countryName: 'China', weight: 0.0742 },
      { country: 'ES', countryName: 'Espanha', weight: 0.0304 },
      { country: 'DE', countryName: 'Alemanha', weight: 0.0285 },
      { country: 'IT', countryName: 'Itália', weight: 0.0244 },
      { country: 'IE', countryName: 'Irlanda', weight: 0.0202 },
    ],
    sectors: [
      { sector: 'Consumer Discretionary', weight: 0.3139 },
      { sector: 'Information Technology', weight: 0.2338 },
      { sector: 'Communication Services', weight: 0.1625 },
      { sector: 'Health Care', weight: 0.1058 },
      { sector: 'Financials', weight: 0.0879 },
      { sector: 'Industrials', weight: 0.0401 },
      { sector: 'Consumer Staples', weight: 0.0234 },
    ],
  },
];

/**
 * Look up static PPR fund data by ISIN.
 * Returns null if the ISIN is not a known PPR fund.
 */
export function getPPRFundData(isin: string): PPRFundData | null {
  return PPR_FUNDS.find((f) => f.isins.includes(isin)) ?? null;
}
