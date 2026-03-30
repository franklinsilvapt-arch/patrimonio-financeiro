import type { ParsedPosition } from './types';

/**
 * Parse a locale-aware number string into a float.
 * Handles:
 *   - Comma as decimal separator (European): "1.234,56" -> 1234.56
 *   - Dot as decimal separator (US/UK): "1,234.56" -> 1234.56
 *   - Plain integers: "1234" -> 1234
 *   - Negative numbers with minus or parentheses: "(1,234.56)" -> -1234.56
 *   - Currency symbols and whitespace are stripped
 */
export function parseNumber(str: string | undefined | null): number | null {
  if (str === undefined || str === null) return null;

  let cleaned = str.trim();
  if (cleaned === '' || cleaned === '-' || cleaned === 'N/A' || cleaned === 'n/a') return null;

  // Remove currency symbols, all Unicode whitespace, and invisible characters
  cleaned = cleaned.replace(/[€$£¥\s\u00A0\u200B\u200C\u200D\uFEFF\u2000-\u200A\u202F\u205F\u3000]/g, '');

  // Handle parentheses for negative numbers: (123) -> -123
  const isNegativeParens = /^\(.*\)$/.test(cleaned);
  if (isNegativeParens) {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  // Determine if comma or dot is the decimal separator.
  // Strategy: the last separator in the string is the decimal separator
  // if it appears only once in that role.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Comma is the decimal separator (European format)
    // Remove dots (thousands), replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Dot is the decimal separator (US format)
    // Remove commas (thousands)
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // No separator or only one type
    cleaned = cleaned.replace(/,/g, '');
  }

  const value = parseFloat(cleaned);
  if (isNaN(value)) return null;

  return isNegativeParens ? -value : value;
}

/**
 * Try to parse a date string in multiple common formats.
 * Returns a Date object or null if unparseable.
 *
 * Supported formats:
 *   DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY,
 *   DD.MM.YYYY, YYYY/MM/DD, ISO 8601
 */
export function parseDate(str: string | undefined | null): Date | null {
  if (!str) return null;

  const trimmed = str.trim();
  if (trimmed === '') return null;

  // Try ISO 8601 first (YYYY-MM-DDTHH:mm:ss...)
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Try YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1]);
    const month = parseInt(dmy[2]);
    const year = parseInt(dmy[3]);

    // If day > 12, it's definitely DD/MM/YYYY
    // If month > 12, it's definitely MM/DD/YYYY
    // Otherwise assume DD/MM/YYYY (European default)
    if (month > 12 && day <= 12) {
      // MM/DD/YYYY interpretation doesn't work, so this must be DD/MM/YYYY with day > 12
      // Actually if month > 12, swap: treat as MM/DD/YYYY where first is month
      const d = new Date(year, day - 1, month);
      if (!isNaN(d.getTime())) return d;
    }

    // Default: DD/MM/YYYY
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Try YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[/](\d{1,2})[/](\d{1,2})$/);
  if (ymd) {
    const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Last resort: try native Date parsing
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

/**
 * Heuristic to detect asset class from instrument name and ticker.
 */
export function detectAssetClass(
  name: string,
  ticker?: string | null
): ParsedPosition['assetClass'] {
  const upper = (name || '').toUpperCase();
  const tickerUpper = (ticker || '').toUpperCase();

  // Cash detection
  if (
    upper.includes('CASH') ||
    upper.includes('MONEY MARKET') ||
    upper.includes('LIQUIDEZ') ||
    upper === 'EUR' ||
    upper === 'USD' ||
    upper === 'GBP'
  ) {
    return 'CASH';
  }

  // ETF detection
  if (
    upper.includes('ETF') ||
    upper.includes('ISHARES') ||
    upper.includes('VANGUARD') ||
    upper.includes('SPDR') ||
    upper.includes('INVESCO') ||
    upper.includes('AMUNDI') ||
    upper.includes('XTRACKERS') ||
    upper.includes('LYXOR') ||
    upper.includes('WISDOMTREE') ||
    upper.includes('UCITS') ||
    upper.includes('ACC') ||
    upper.includes('ACCUMULATING') ||
    upper.includes('DISTRIBUTING')
  ) {
    return 'ETF';
  }

  // Crypto detection
  if (
    upper.includes('BITCOIN') ||
    upper.includes('ETHEREUM') ||
    upper.includes('CRYPTO') ||
    tickerUpper === 'BTC' ||
    tickerUpper === 'ETH' ||
    tickerUpper === 'SOL' ||
    tickerUpper === 'ADA' ||
    tickerUpper === 'XRP'
  ) {
    return 'CRYPTO';
  }

  // Bond detection
  if (
    upper.includes('BOND') ||
    upper.includes('TREASURY') ||
    upper.includes('GILT') ||
    upper.includes('OBRIGAC') ||
    upper.includes('FIXED INCOME') ||
    upper.includes('GOVT') ||
    upper.includes('GOVERNMENT')
  ) {
    return 'BOND';
  }

  // Fund detection
  if (
    upper.includes('FUND') ||
    upper.includes('FUNDO') ||
    upper.includes('SICAV') ||
    upper.includes('OEIC')
  ) {
    return 'FUND';
  }

  // Commodity detection
  if (
    upper.includes('GOLD') ||
    upper.includes('SILVER') ||
    upper.includes('PLATINUM') ||
    upper.includes('COMMODITY') ||
    upper.includes('OIL') ||
    upper.includes('OURO')
  ) {
    return 'COMMODITY';
  }

  // Default to equity
  return 'EQUITY';
}

/**
 * Normalize CSV content: strip BOM, normalize line endings.
 */
export function normalizeCSVContent(content: string): string {
  // Strip UTF-8 BOM and other zero-width/invisible characters
  let normalized = content.replace(/^[\uFEFF\u200B\u200C\u200D\uFFFE\uFFFF]/, '');

  // Normalize line endings to \n
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Clean invisible characters from the header line (first line)
  // that can break column name matching
  const lines = normalized.split('\n');
  if (lines.length > 0) {
    lines[0] = lines[0].replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ');
    normalized = lines.join('\n');
  }

  // Remove trailing newlines
  normalized = normalized.trimEnd();

  return normalized;
}

/**
 * Find a column value by trying multiple possible column names (case-insensitive).
 * Returns the first matching value or undefined.
 */
export function getColumnValue(
  row: Record<string, string>,
  possibleNames: string[]
): string | undefined {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];

    // Try case-insensitive match
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerName) return row[key];
    }

    // Try trimmed match (handles whitespace in headers)
    for (const key of Object.keys(row)) {
      if (key.trim().toLowerCase() === lowerName) return row[key];
    }
  }

  return undefined;
}
