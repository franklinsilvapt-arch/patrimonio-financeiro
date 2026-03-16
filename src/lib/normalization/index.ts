// ---------------------------------------------------------------------------
// Security normalization and matching
// ---------------------------------------------------------------------------

import type { MatchType } from '@/lib/types';

/**
 * Normalize a security name for fuzzy matching.
 * Lowercases, strips special characters, collapses whitespace, and trims.
 */
export function normalizeSecurityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove non-alphanumeric (keep spaces)
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

// ---------------------------------------------------------------------------
// Types for the matching function
// ---------------------------------------------------------------------------

export interface ParsedSecurityInput {
  isin?: string;
  ticker?: string;
  exchange?: string;
  name: string;
  currency: string;
}

export interface ExistingSecurity {
  id: string;
  isin: string | null;
  ticker: string | null;
  normalizedName: string | null;
  exchange: string | null;
}

export interface MatchResult {
  securityId: string | null;
  matchType: MatchType;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Main matching logic
// ---------------------------------------------------------------------------

/**
 * Find a matching security from a list of existing securities.
 *
 * Priority order:
 *  1. ISIN exact match         -> confidence 1.0
 *  2. Ticker + exchange match  -> confidence 0.9
 *  3. Ticker-only match        -> confidence 0.8
 *  4. Normalized name match    -> confidence 0.6
 *  5. No match (new security)  -> confidence 1.0 (for new creation)
 */
export function findMatchingSecurity(
  parsed: ParsedSecurityInput,
  existingSecurities: ExistingSecurity[],
): MatchResult {
  // 1) ISIN exact match
  if (parsed.isin) {
    const isinNormalized = parsed.isin.trim().toUpperCase();
    const match = existingSecurities.find(
      (s) => s.isin !== null && s.isin.toUpperCase() === isinNormalized,
    );
    if (match) {
      return { securityId: match.id, matchType: 'isin', confidence: 1.0 };
    }
  }

  // 2) Ticker + exchange match
  if (parsed.ticker && parsed.exchange) {
    const tickerNorm = parsed.ticker.trim().toUpperCase();
    const exchangeNorm = parsed.exchange.trim().toUpperCase();

    const match = existingSecurities.find(
      (s) =>
        s.ticker !== null &&
        s.exchange !== null &&
        s.ticker.toUpperCase() === tickerNorm &&
        s.exchange.toUpperCase() === exchangeNorm,
    );
    if (match) {
      return {
        securityId: match.id,
        matchType: 'ticker_exchange',
        confidence: 0.9,
      };
    }
  }

  // 3) Ticker-only match (no exchange or exchange didn't match)
  if (parsed.ticker) {
    const tickerNorm = parsed.ticker.trim().toUpperCase();

    const matches = existingSecurities.filter(
      (s) => s.ticker !== null && s.ticker.toUpperCase() === tickerNorm,
    );

    if (matches.length === 1) {
      return {
        securityId: matches[0].id,
        matchType: 'ticker_exchange', // still counts as ticker-based
        confidence: 0.8,
      };
    }
    // If multiple ticker matches, fall through to name matching for
    // disambiguation rather than picking arbitrarily.
  }

  // 4) Normalized name match
  const parsedNormalized = normalizeSecurityName(parsed.name);

  if (parsedNormalized.length > 0) {
    const match = existingSecurities.find(
      (s) =>
        s.normalizedName !== null &&
        s.normalizedName === parsedNormalized,
    );
    if (match) {
      return { securityId: match.id, matchType: 'name', confidence: 0.6 };
    }
  }

  // 5) No match - this is a new security
  return { securityId: null, matchType: 'new', confidence: 1.0 };
}
