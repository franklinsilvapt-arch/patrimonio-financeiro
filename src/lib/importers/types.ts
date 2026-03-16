export interface ImporterConfig {
  brokerId: string;
  brokerSlug: string;
}

export interface RawImportRow {
  [key: string]: string;
}

export interface ParsedPosition {
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  price: number | null;
  marketValue: number | null;
  currency: string;
  assetClass: 'EQUITY' | 'ETF' | 'BOND' | 'FUND' | 'CASH' | 'CRYPTO' | 'COMMODITY' | 'OTHER';
  exchange: string | null;
  positionDate: Date | null;
  priceDate: Date | null;
}

export interface ImportParseResult {
  positions: ParsedPosition[];
  errors: string[];
  warnings: string[];
  referenceDate: Date | null;
}

export interface BrokerImporter {
  brokerSlug: string;
  parseCSV(content: string): Promise<ImportParseResult>;
  detectFormat(content: string): boolean;
}
