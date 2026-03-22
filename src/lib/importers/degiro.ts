import { parse } from 'csv-parse/sync';
import type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow } from './types';
import {
  normalizeCSVContent,
  getColumnValue,
  parseNumber,
  parseDate,
  detectAssetClass,
} from './base';

const PRODUCT_COLUMNS = ['Produto', 'Product', 'Produkt'];
const ISIN_COLUMNS = ['Symbol/ISIN', 'ISIN', 'Symbool/ISIN'];
const QUANTITY_COLUMNS = ['Quantidade', 'Qty', 'Quantity', 'Aantal', 'Amount'];
const CLOSE_PRICE_COLUMNS = [
  'Preço de fecho',
  'Preco de fecho',
  'Close price',
  'Closing price',
  'Closing',
  'Slotkoers',
];
const VALUE_COLUMNS = [
  'Valor em EUR',
  'Valor em USD',
  'Value in EUR',
  'Value in USD',
  'Value in GBP',
  'Value in CHF',
  'Value',
  'Local value',
  'Waarde in EUR',
];
const CURRENCY_COLUMNS = ['Moeda', 'Currency', 'Valuta'];
const EXCHANGE_COLUMNS = ['Bolsa', 'Exchange', 'Beurs'];

export class DegiroImporter implements BrokerImporter {
  brokerSlug = 'degiro';

  detectFormat(content: string): boolean {
    const normalized = normalizeCSVContent(content);
    const firstLine = normalized.split('\n')[0] || '';
    const upper = firstLine.toUpperCase();

    return (
      upper.includes('PRODUTO') ||
      (upper.includes('PRODUCT') && upper.includes('SYMBOL/ISIN')) ||
      (upper.includes('SYMBOL/ISIN') && (upper.includes('QUANTIDADE') || upper.includes('QTY') || upper.includes('AMOUNT')))
    );
  }

  async parseCSV(content: string): Promise<ImportParseResult> {
    const normalized = normalizeCSVContent(content);
    const errors: string[] = [];
    const warnings: string[] = [];
    const positions: ParsedPosition[] = [];

    // Detect delimiter: DEGIRO uses comma or semicolon
    const firstLine = normalized.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    // Detect if Portuguese format (comma decimal separator)
    const isPortuguese =
      firstLine.toUpperCase().includes('PRODUTO') ||
      firstLine.toUpperCase().includes('QUANTIDADE');

    let rows: RawImportRow[];
    try {
      rows = parse(normalized, {
        columns: true,
        skip_empty_lines: true,
        delimiter,
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { positions: [], errors: [`Failed to parse CSV: ${msg}`], warnings: [], referenceDate: null };
    }

    if (rows.length === 0) {
      return { positions: [], errors: ['CSV file contains no data rows'], warnings: [], referenceDate: null };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 1-based index

      try {
        const name = getColumnValue(row, PRODUCT_COLUMNS);
        if (!name || name.trim() === '') {
          warnings.push(`Row ${rowNum}: skipping empty product name`);
          continue;
        }

        const isinRaw = getColumnValue(row, ISIN_COLUMNS) || null;
        const quantityStr = getColumnValue(row, QUANTITY_COLUMNS);
        const priceStr = getColumnValue(row, CLOSE_PRICE_COLUMNS);
        const valueStr = getColumnValue(row, VALUE_COLUMNS);
        // Currency may be in a named column or in an unnamed column (empty header)
        let currency = getColumnValue(row, CURRENCY_COLUMNS);
        if (!currency) {
          // DEGIRO sometimes has currency in an unnamed column — scan values for currency codes
          for (const val of Object.values(row)) {
            const trimmed = (val as string)?.trim?.()?.toUpperCase?.();
            if (trimmed && /^[A-Z]{3}$/.test(trimmed) && ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'].includes(trimmed)) {
              currency = trimmed;
              break;
            }
          }
        }
        currency = currency || 'EUR';
        const exchange = getColumnValue(row, EXCHANGE_COLUMNS) || null;

        // Parse quantity - handle Portuguese comma decimals
        let quantity: number | null;
        if (isPortuguese) {
          quantity = parseNumber(quantityStr);
        } else {
          quantity = parseNumber(quantityStr);
        }

        const price = parseNumber(priceStr);
        const marketValue = parseNumber(valueStr);

        // Detect CASH lines (e.g., "CASH & CASH FUND & FTX CASH (EUR)")
        const isCashLine = /^CASH\s*[&]/i.test(name.trim());

        if (isCashLine) {
          // For cash lines, use the EUR value as market value; skip if zero
          const cashValue = marketValue;
          if (cashValue === null || cashValue === 0) {
            warnings.push(`Row ${rowNum}: skipping "${name}" — cash balance is zero`);
            continue;
          }
          // Extract currency from name like "CASH & CASH FUND & FTX CASH (EUR)"
          const cashCurrencyMatch = name.match(/\(([A-Z]{3})\)/);
          const cashCurrency = cashCurrencyMatch ? cashCurrencyMatch[1] : currency;
          positions.push({
            name: `Cash DEGIRO (${cashCurrency})`,
            ticker: null,
            isin: null,
            quantity: 1,
            price: cashValue,
            marketValue: cashValue,
            currency: 'EUR', // Value in EUR column
            assetClass: 'CASH',
            exchange: null,
            positionDate: null,
            priceDate: null,
          });
          continue;
        }

        if (quantity === null || quantity === 0) {
          warnings.push(`Row ${rowNum}: skipping "${name}" with zero/invalid quantity`);
          continue;
        }

        // Extract ISIN (should be in format like US0378331005 or similar)
        let isin: string | null = null;
        let ticker: string | null = null;
        if (isinRaw) {
          const isinMatch = isinRaw.match(/[A-Z]{2}[A-Z0-9]{10}/);
          if (isinMatch) {
            isin = isinMatch[0];
          }
          // If the field contains something that's not an ISIN, treat it as ticker
          if (!isin && isinRaw.trim().length > 0 && isinRaw.trim().length <= 10) {
            ticker = isinRaw.trim();
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
          exchange: exchange ? exchange.trim() : null,
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
