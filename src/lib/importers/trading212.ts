import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import {
  normalizeCSVContent,
  getColumnValue,
  parseNumber,
  parseDate,
  detectAssetClass,
} from './base';

// Portfolio export format columns
const INSTRUMENT_COLUMNS = ['Instrument', 'Name', 'Holding'];
const TICKER_COLUMNS = ['Ticker', 'Symbol', 'Ticker / ISIN'];
const ISIN_COLUMNS = ['ISIN', 'Isin'];
const SHARES_COLUMNS = ['Shares', 'No. of shares', 'Quantity', 'No. of Shares'];
const PRICE_COLUMNS = ['Current price', 'Price / share', 'Price', 'Current Price'];
const VALUE_COLUMNS = ['Market value', 'Result', 'Value', 'Market Value'];
const CURRENCY_COLUMNS = [
  'Currency code',
  'Currency (Price / share)',
  'Currency',
  'Currency Code',
  'CCY',
];

// Transaction history format columns (alternative format)
const ACTION_COLUMNS = ['Action', 'Type'];
const TIME_COLUMNS = ['Time', 'Date', 'Timestamp'];

export class Trading212Importer implements BrokerImporter {
  brokerSlug = 'trading212';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const firstLine = normalized.split('\n')[0] || '';
    const upper = firstLine.toUpperCase();

    // Portfolio/holdings export
    if (
      (upper.includes('INSTRUMENT') || upper.includes('HOLDING')) &&
      (upper.includes('SHARES') || upper.includes('NO. OF SHARES')) &&
      (upper.includes('CURRENT PRICE') || upper.includes('MARKET VALUE'))
    ) {
      return true;
    }

    // Transaction history export
    if (
      upper.includes('ACTION') &&
      upper.includes('TIME') &&
      upper.includes('TICKER') &&
      (upper.includes('NO. OF SHARES') || upper.includes('SHARES'))
    ) {
      return true;
    }

    // Generic Trading 212 detection
    if (
      upper.includes('TICKER') &&
      upper.includes('ISIN') &&
      (upper.includes('SHARES') || upper.includes('CURRENT PRICE'))
    ) {
      return true;
    }

    return false;
  }

  async parseCSV(content: string): Promise<ImportParseResult> {
    const normalized = normalizeCSVContent(content);
    const errors: string[] = [];
    const warnings: string[] = [];
    const positions: ParsedPosition[] = [];

    let rows: RawImportRow[];
    try {
      rows = parse(normalized, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        positions: [],
        errors: [`Failed to parse CSV: ${msg}`],
        warnings: [],
        referenceDate: null,
      };
    }

    if (rows.length === 0) {
      return {
        positions: [],
        errors: ['CSV file contains no data rows'],
        warnings: [],
        referenceDate: null,
      };
    }

    // Detect format: portfolio export vs transaction history
    const firstRow = rows[0];
    const hasAction = getColumnValue(firstRow, ACTION_COLUMNS) !== undefined;

    if (hasAction) {
      return this.parseTransactionFormat(rows, errors, warnings);
    }

    return this.parsePortfolioFormat(rows, errors, warnings);
  }

  private parsePortfolioFormat(
    rows: RawImportRow[],
    errors: string[],
    warnings: string[]
  ): ImportParseResult {
    const positions: ParsedPosition[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = getColumnValue(row, INSTRUMENT_COLUMNS);
        if (!name || name.trim() === '') {
          warnings.push(`Row ${rowNum}: skipping empty instrument name`);
          continue;
        }

        const tickerRaw = getColumnValue(row, TICKER_COLUMNS);
        const isinRaw = getColumnValue(row, ISIN_COLUMNS);
        const sharesStr = getColumnValue(row, SHARES_COLUMNS);
        const priceStr = getColumnValue(row, PRICE_COLUMNS);
        const valueStr = getColumnValue(row, VALUE_COLUMNS);
        const currency = getColumnValue(row, CURRENCY_COLUMNS) || 'EUR';

        const quantity = parseNumber(sharesStr);
        if (quantity === null || quantity === 0) {
          warnings.push(`Row ${rowNum}: skipping "${name}" with zero/invalid quantity`);
          continue;
        }

        const price = parseNumber(priceStr);
        const marketValue = parseNumber(valueStr);

        // Parse ISIN
        let isin: string | null = null;
        if (isinRaw) {
          const isinMatch = isinRaw.match(/[A-Z]{2}[A-Z0-9]{10}/);
          if (isinMatch) isin = isinMatch[0];
        }

        // Parse ticker - Trading 212 sometimes puts ISIN in ticker field
        let ticker: string | null = null;
        if (tickerRaw) {
          const trimmed = tickerRaw.trim();
          // If it looks like an ISIN and we don't have one yet, use it as ISIN
          if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(trimmed) && !isin) {
            isin = trimmed;
          } else if (trimmed.length <= 10) {
            ticker = trimmed;
          }
        }

        const assetClass = detectAssetClass(name, ticker);

        const position: ParsedPosition = {
          name: name.trim(),
          ticker,
          isin,
          quantity,
          price,
          marketValue,
          currency: currency.trim().toUpperCase(),
          assetClass,
          exchange: null,
          positionDate: null,
          priceDate: null,
        };

        positions.push(position);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Row ${rowNum}: ${msg}`);
      }
    }

    return { positions, errors, warnings, referenceDate: null };
  }

  private parseTransactionFormat(
    rows: RawImportRow[],
    errors: string[],
    warnings: string[]
  ): ImportParseResult {
    // For transaction history, aggregate buy/sell to compute net positions
    const positionMap = new Map<
      string,
      {
        name: string;
        ticker: string | null;
        isin: string | null;
        quantity: number;
        totalCost: number;
        currency: string;
        lastDate: Date | null;
      }
    >();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const action = getColumnValue(row, ACTION_COLUMNS) || '';
        const actionUpper = action.toUpperCase();

        // Only process buy/sell transactions (market buy, limit buy, market sell, limit sell)
        if (!actionUpper.includes('BUY') && !actionUpper.includes('SELL')) {
          continue;
        }

        const name = getColumnValue(row, INSTRUMENT_COLUMNS) || getColumnValue(row, ['Name']);
        const tickerRaw = getColumnValue(row, TICKER_COLUMNS);
        const isinRaw = getColumnValue(row, ISIN_COLUMNS);
        const sharesStr = getColumnValue(row, SHARES_COLUMNS);
        const priceStr = getColumnValue(row, PRICE_COLUMNS);
        const totalStr = getColumnValue(row, ['Total']);
        const totalCurrency = getColumnValue(row, ['Currency (Total)']) || 'EUR';
        const timeStr = getColumnValue(row, TIME_COLUMNS);
        const currency = totalCurrency.trim().toUpperCase() || 'EUR';

        if (!name && !tickerRaw) {
          warnings.push(`Row ${rowNum}: skipping transaction with no name or ticker`);
          continue;
        }

        const shares = parseNumber(sharesStr);
        if (shares === null) {
          warnings.push(`Row ${rowNum}: skipping transaction with invalid shares`);
          continue;
        }

        // Use Total (in EUR) when available, otherwise fall back to Price * shares
        const totalValue = parseNumber(totalStr);
        const price = parseNumber(priceStr) || 0;
        const costForPosition = totalValue !== null ? totalValue : price * shares;
        const date = parseDate(timeStr);

        const key = (isinRaw || tickerRaw || name || '').trim().toUpperCase();
        const isSell = actionUpper.includes('SELL');
        const signedShares = isSell ? -shares : shares;

        let isin: string | null = null;
        if (isinRaw) {
          const match = isinRaw.match(/[A-Z]{2}[A-Z0-9]{10}/);
          if (match) isin = match[0];
        }

        const ticker = tickerRaw ? tickerRaw.trim() : null;

        const signedCost = isSell ? -costForPosition : costForPosition;

        const existing = positionMap.get(key);
        if (existing) {
          existing.quantity += signedShares;
          existing.totalCost += signedCost;
          if (date && (!existing.lastDate || date > existing.lastDate)) {
            existing.lastDate = date;
          }
        } else {
          positionMap.set(key, {
            name: (name || tickerRaw || 'Unknown').trim(),
            ticker,
            isin,
            quantity: signedShares,
            totalCost: signedCost,
            currency,
            lastDate: date,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Row ${rowNum}: ${msg}`);
      }
    }

    // Convert aggregated positions to ParsedPosition[]
    const positions: ParsedPosition[] = [];
    for (const entry of Array.from(positionMap.values())) {
      // Skip closed positions
      if (Math.abs(entry.quantity) < 0.0001) continue;

      // Skip negative positions (shouldn't happen in long-only)
      if (entry.quantity < 0) {
        warnings.push(
          `Skipping "${entry.name}" with negative net quantity ${entry.quantity}`
        );
        continue;
      }

      const avgPrice = entry.quantity !== 0 ? entry.totalCost / entry.quantity : null;
      const marketValue = avgPrice !== null ? avgPrice * entry.quantity : null;
      const assetClass = detectAssetClass(entry.name, entry.ticker);

      positions.push({
        name: entry.name,
        ticker: entry.ticker,
        isin: entry.isin,
        quantity: entry.quantity,
        price: avgPrice,
        marketValue,
        currency: entry.currency,
        assetClass,
        exchange: null,
        positionDate: entry.lastDate,
        priceDate: null,
      });
    }

    return { positions, errors, warnings, referenceDate: null };
  }
}
