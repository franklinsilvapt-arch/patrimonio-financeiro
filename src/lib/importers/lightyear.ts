import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import {
  normalizeCSVContent,
  getColumnValue,
  parseNumber,
  detectAssetClass,
} from './base';

const INSTRUMENT_COLUMNS = ['Instrument', 'Name', 'Instrument Name'];
const ISIN_COLUMNS = ['ISIN', 'Isin'];
const TICKER_COLUMNS = ['Ticker', 'Symbol', 'Ticker Symbol'];
const QUANTITY_COLUMNS = ['Quantity', 'Qty', 'Shares', 'No. of shares'];
const AVG_PRICE_COLUMNS = ['Average Price', 'Avg Price', 'Avg. Price', 'Average price'];
const CURRENT_PRICE_COLUMNS = ['Current Price', 'Price', 'Market Price', 'Current price'];
const VALUE_COLUMNS = ['Current Value', 'Value', 'Market Value', 'Current value'];
const CURRENCY_COLUMNS = ['Currency', 'CCY', 'Currency Code'];

export class LightyearImporter implements BrokerImporter {
  brokerSlug = 'lightyear';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const firstLine = normalized.split('\n')[0] || '';
    const upper = firstLine.toUpperCase();

    return (
      upper.includes('INSTRUMENT') &&
      upper.includes('ISIN') &&
      (upper.includes('QUANTITY') || upper.includes('QTY') || upper.includes('SHARES'))
    );
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = getColumnValue(row, INSTRUMENT_COLUMNS);
        if (!name || name.trim() === '') {
          warnings.push(`Row ${rowNum}: skipping empty instrument name`);
          continue;
        }

        const isinRaw = getColumnValue(row, ISIN_COLUMNS);
        const tickerRaw = getColumnValue(row, TICKER_COLUMNS);
        const quantityStr = getColumnValue(row, QUANTITY_COLUMNS);
        const avgPriceStr = getColumnValue(row, AVG_PRICE_COLUMNS);
        const currentPriceStr = getColumnValue(row, CURRENT_PRICE_COLUMNS);
        const valueStr = getColumnValue(row, VALUE_COLUMNS);
        const currency = getColumnValue(row, CURRENCY_COLUMNS) || 'EUR';

        const quantity = parseNumber(quantityStr);
        if (quantity === null || quantity === 0) {
          warnings.push(`Row ${rowNum}: skipping "${name}" with zero/invalid quantity`);
          continue;
        }

        // Use current price if available, fall back to average price
        const price = parseNumber(currentPriceStr) ?? parseNumber(avgPriceStr);
        const marketValue = parseNumber(valueStr);

        // Parse ISIN
        let isin: string | null = null;
        if (isinRaw) {
          const isinMatch = isinRaw.trim().match(/^[A-Z]{2}[A-Z0-9]{10}$/);
          if (isinMatch) {
            isin = isinMatch[0];
          } else if (/[A-Z]{2}[A-Z0-9]{10}/.test(isinRaw)) {
            const match = isinRaw.match(/[A-Z]{2}[A-Z0-9]{10}/);
            if (match) isin = match[0];
          }
        }

        const ticker = tickerRaw ? tickerRaw.trim() : null;
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
}
