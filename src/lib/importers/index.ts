import type { BrokerImporter } from './types';
import { DegiroImporter } from './degiro';
import { DegiroTransactionsImporter } from './degiro-transactions';
import { IbkrImporter } from './ibkr';
import { LightyearImporter } from './lightyear';
import { Trading212Importer } from './trading212';
import { Trading212TransactionsImporter } from './trading212-transactions';

export type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow, ImporterConfig } from './types';
export { parseNumber, parseDate, detectAssetClass, normalizeCSVContent, getColumnValue } from './base';
export { DegiroImporter } from './degiro';
export { DegiroTransactionsImporter } from './degiro-transactions';
export { IbkrImporter } from './ibkr';
export { LightyearImporter } from './lightyear';
export { Trading212Importer } from './trading212';
export { Trading212TransactionsImporter } from './trading212-transactions';

/**
 * Registry mapping broker slugs to their importer instances.
 * Transaction importers are registered with a "-transactions" suffix
 * but map to the same broker slug for auto-detection.
 */
export const importerRegistry: Map<string, BrokerImporter> = new Map([
  ['degiro', new DegiroImporter()],
  ['degiro-transactions', new DegiroTransactionsImporter()],
  ['ibkr', new IbkrImporter()],
  ['lightyear', new LightyearImporter()],
  ['trading212', new Trading212Importer()],
  ['trading212-transactions', new Trading212TransactionsImporter()],
]);

/**
 * Get an importer by broker slug.
 */
export function getImporter(slug: string): BrokerImporter | undefined {
  return importerRegistry.get(slug);
}

/**
 * Auto-detect which importer matches the given CSV content.
 * Transaction importers are tried first (more specific format),
 * then portfolio importers.
 */
export function detectImporter(csvContent: string): BrokerImporter | null {
  // Try transaction importers first (they have stricter detection)
  const txImporters = ['degiro-transactions', 'trading212-transactions'];
  for (const key of txImporters) {
    const imp = importerRegistry.get(key);
    if (imp?.detectFormat(csvContent)) return imp;
  }
  // Then portfolio importers
  for (const [key, importer] of importerRegistry) {
    if (txImporters.includes(key)) continue;
    if (importer.detectFormat(csvContent)) return importer;
  }
  return null;
}
