import type { BrokerImporter } from './types';
import { DegiroImporter } from './degiro';
import { IbkrImporter } from './ibkr';
import { LightyearImporter } from './lightyear';
import { Trading212Importer } from './trading212';

export type { BrokerImporter, ImportParseResult, ParsedPosition, RawImportRow, ImporterConfig } from './types';
export { parseNumber, parseDate, detectAssetClass, normalizeCSVContent, getColumnValue } from './base';
export { DegiroImporter } from './degiro';
export { IbkrImporter } from './ibkr';
export { LightyearImporter } from './lightyear';
export { Trading212Importer } from './trading212';

/**
 * Registry mapping broker slugs to their importer instances.
 */
export const importerRegistry: Map<string, BrokerImporter> = new Map([
  ['degiro', new DegiroImporter()],
  ['ibkr', new IbkrImporter()],
  ['lightyear', new LightyearImporter()],
  ['trading212', new Trading212Importer()],
]);

/**
 * Get an importer by broker slug.
 */
export function getImporter(slug: string): BrokerImporter | undefined {
  return importerRegistry.get(slug);
}

/**
 * Auto-detect which importer matches the given CSV content.
 * Returns the first matching importer, or null if none match.
 */
export function detectImporter(csvContent: string): BrokerImporter | null {
  for (const importer of Array.from(importerRegistry.values())) {
    if (importer.detectFormat(csvContent)) {
      return importer;
    }
  }
  return null;
}
