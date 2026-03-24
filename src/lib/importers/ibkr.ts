import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import {
  normalizeCSVContent,
  getColumnValue,
  parseNumber,
  parseDate,
  detectAssetClass,
} from './base';

const SYMBOL_COLUMNS = ['Symbol', 'Ticker', 'Financial Instrument', 'Financial Instrument Description'];
const DESCRIPTION_COLUMNS = ['Description', 'Financial Instrument Description', 'Name'];
const ASSET_CLASS_COLUMNS = ['Asset Class', 'AssetClass', 'Asset Category', 'Security Type'];
const CURRENCY_COLUMNS = ['Currency', 'Cur.', 'CCY'];
const QUANTITY_COLUMNS = ['Quantity', 'Position', 'Qty'];
const PRICE_COLUMNS = ['Close Price', 'Mark Price', 'Market Price', 'Price', 'Current Price'];
const VALUE_COLUMNS = ['Value', 'Market Value', 'Position Value', 'Value in USD'];
const ISIN_COLUMNS = ['ISIN', 'Security ID'];

const IBKR_ASSET_CLASS_MAP: Record<string, ParsedPosition['assetClass']> = {
  STK: 'EQUITY',
  STOCK: 'EQUITY',
  EQUITY: 'EQUITY',
  ETF: 'ETF',
  BOND: 'BOND',
  BILL: 'BOND',
  FUND: 'FUND',
  CASH: 'CASH',
  CRYPTO: 'CRYPTO',
  CMDTY: 'COMMODITY',
  COMMODITY: 'COMMODITY',
  FUT: 'OTHER',
  OPT: 'OTHER',
  WAR: 'OTHER',
  CFD: 'OTHER',
};

export class IbkrImporter implements BrokerImporter {
  brokerSlug = 'ibkr';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const lines = normalized.split('\n');

    // IBKR activity statements can have metadata lines before the actual CSV
    // Look for typical IBKR patterns in the first 20 lines
    const searchArea = lines.slice(0, 20).join('\n').toUpperCase();

    return (
      (searchArea.includes('SYMBOL') && searchArea.includes('ASSET CLASS')) ||
      (searchArea.includes('FINANCIAL INSTRUMENT') && searchArea.includes('POSITION')) ||
      searchArea.includes('INTERACTIVE BROKERS') ||
      (searchArea.includes('OPEN POSITIONS') && searchArea.includes('HEADER'))
    );
  }

  async parseCSV(content: string): Promise<ImportParseResult> {
    const normalized = normalizeCSVContent(content);
    const errors: string[] = [];
    const warnings: string[] = [];
    const positions: ParsedPosition[] = [];
    let referenceDate: Date | null = null;

    // IBKR activity statements have a special format:
    // section,header/data marker,columns...
    // We need to find the "Open Positions" or similar section
    const lines = normalized.split('\n');

    // Try to extract statement date
    for (const line of lines.slice(0, 10)) {
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        referenceDate = parseDate(dateMatch[1]);
        if (referenceDate) break;
      }
    }

    // Strategy 1: Try to find IBKR sectioned format (section,Header/Data,...)
    const positionLines = this.extractPositionSection(lines);

    if (positionLines.length > 0) {
      // Parse the extracted section
      return this.parseRows(positionLines.join('\n'), errors, warnings, referenceDate);
    }

    // Strategy 2: Try plain CSV format, but skip title/metadata lines
    // IBKR exports can have a title line like "Portfolio" before the actual header
    const cleanedLines = this.skipMetadataLines(lines);
    const result = await this.parseRows(cleanedLines.join('\n'), errors, warnings, referenceDate);

    // Add cash position if found in "Cash Balances" section
    if (this.cashTotalEur && this.cashTotalEur !== 0) {
      result.positions.push({
        name: 'Liquidez',
        ticker: null,
        isin: null,
        quantity: 1,
        price: this.cashTotalEur,
        marketValue: this.cashTotalEur,
        currency: 'EUR',
        assetClass: 'CASH',
        exchange: null,
        positionDate: referenceDate,
        priceDate: referenceDate,
      });
    }

    return result;
  }

  /**
   * Skip leading title/metadata lines that aren't part of the CSV table.
   * The real header is the first line containing known column names.
   * Also strips trailing sections like "Cash Balances" but extracts cash total.
   */
  private cashTotalEur: number | null = null;

  private skipMetadataLines(lines: string[]): string[] {
    const HEADER_MARKERS = [
      'FINANCIAL INSTRUMENT', 'SYMBOL', 'DESCRIPTION', 'POSITION',
      'MARKET VALUE', 'ASSET CLASS', 'SECURITY TYPE', 'QUANTITY',
    ];

    // Find the header line
    let headerIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const upper = lines[i].toUpperCase();
      const matchCount = HEADER_MARKERS.filter(m => upper.includes(m)).length;
      if (matchCount >= 2) {
        headerIndex = i;
        break;
      }
    }

    // Find where data ends and extract cash total
    let endIndex = lines.length;
    this.cashTotalEur = null;
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '') {
        endIndex = Math.min(endIndex, i);
        continue;
      }
      const upper = trimmed.toUpperCase();
      // Extract "Total (in EUR),911,EUR" line
      if (upper.startsWith('TOTAL (IN EUR)') || upper.startsWith('TOTAL(IN EUR)')) {
        const parts = trimmed.split(',');
        const val = parseNumber(parts[1]);
        if (val !== null && val !== 0) {
          this.cashTotalEur = val;
        }
      }
      if (
        (upper === 'CASH BALANCES' || upper === 'TOTALS' || upper.startsWith('TOTAL (') || upper.startsWith('TOTAL(')) ||
        (upper.match(/^[A-Z ]+$/) && !trimmed.includes(','))
      ) {
        endIndex = Math.min(endIndex, i);
      }
    }

    return lines.slice(headerIndex, endIndex);
  }

  private extractPositionSection(lines: string[]): string[] {
    const result: string[] = [];
    let inPositions = false;
    let headerFound = false;

    for (const line of lines) {
      const upper = line.toUpperCase();

      if (upper.startsWith('OPEN POSITIONS') || upper.startsWith('"OPEN POSITIONS"')) {
        inPositions = true;
        continue;
      }

      if (inPositions) {
        // Check if we hit a new section
        if (
          !headerFound &&
          (upper.includes(',HEADER,') || upper.includes('"HEADER"'))
        ) {
          // This is the header row, extract columns after "Header"
          const parts = this.stripSectionPrefix(line);
          if (parts) {
            result.push(parts);
            headerFound = true;
          }
          continue;
        }

        if (headerFound) {
          if (
            upper.includes(',DATA,') ||
            upper.includes('"DATA"')
          ) {
            const parts = this.stripSectionPrefix(line);
            if (parts) result.push(parts);
          } else if (
            upper.includes(',TOTAL,') ||
            upper.includes('"TOTAL"') ||
            (line.trim() === '')
          ) {
            // End of data rows, or blank line
            continue;
          } else if (
            upper.match(/^[A-Z]/) &&
            !upper.startsWith('OPEN POSITIONS')
          ) {
            // New section started
            break;
          }
        }
      }
    }

    return result;
  }

  private stripSectionPrefix(line: string): string | null {
    // Remove "Open Positions,Header," or "Open Positions,Data," prefix
    // Handle both quoted and unquoted
    const match = line.match(
      /^"?[^,"]*"?\s*,\s*"?(Header|Data)"?\s*,\s*(.*)/i
    );
    if (match) return match[2];
    return null;
  }

  private async parseRows(
    csvContent: string,
    errors: string[],
    warnings: string[],
    referenceDate: Date | null
  ): Promise<ImportParseResult> {
    const positions: ParsedPosition[] = [];

    let rows: RawImportRow[];
    try {
      rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        positions: [],
        errors: [`Failed to parse CSV: ${msg}`],
        warnings,
        referenceDate,
      };
    }

    if (rows.length === 0) {
      return {
        positions: [],
        errors: ['CSV file contains no data rows'],
        warnings,
        referenceDate,
      };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const symbol = getColumnValue(row, SYMBOL_COLUMNS);
        const description = getColumnValue(row, DESCRIPTION_COLUMNS);
        const assetClassStr = getColumnValue(row, ASSET_CLASS_COLUMNS);
        const currency = getColumnValue(row, CURRENCY_COLUMNS) || 'USD';
        const quantityStr = getColumnValue(row, QUANTITY_COLUMNS);
        const priceStr = getColumnValue(row, PRICE_COLUMNS);
        const valueStr = getColumnValue(row, VALUE_COLUMNS);
        const isinRaw = getColumnValue(row, ISIN_COLUMNS);

        if (!symbol && !description) {
          warnings.push(`Row ${rowNum}: skipping row with no symbol or description`);
          continue;
        }

        const name = description || symbol || 'Unknown';
        const ticker = symbol ? symbol.trim() : null;

        const quantity = parseNumber(quantityStr);
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

        // Determine asset class
        let assetClass: ParsedPosition['assetClass'] = 'EQUITY';
        if (assetClassStr) {
          const mapped =
            IBKR_ASSET_CLASS_MAP[assetClassStr.trim().toUpperCase()];
          if (mapped) {
            assetClass = mapped;
          } else {
            assetClass = detectAssetClass(name, ticker);
          }
        } else {
          assetClass = detectAssetClass(name, ticker);
        }

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
          positionDate: referenceDate,
          priceDate: referenceDate,
        };

        positions.push(position);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Row ${rowNum}: ${msg}`);
      }
    }

    return { positions, errors, warnings, referenceDate };
  }
}
