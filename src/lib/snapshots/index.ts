// ---------------------------------------------------------------------------
// Portfolio snapshot logic
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db';
import type { AssetClassType, BrokerSlug } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HoldingForSnapshot {
  securityId: string;
  assetClass: AssetClassType;
  marketValue: number | null;
  currency: string;
  accountId: string;
  brokerSlug: BrokerSlug;
}

export interface SnapshotResult {
  id: string;
  date: Date;
  totalValue: number;
  currency: string;
  brokerBreakdown: Record<string, number>;
  assetBreakdown: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Calculate total value
// ---------------------------------------------------------------------------

/**
 * Sum market values across all holdings.
 * For the MVP, assumes everything is in EUR (no FX conversion).
 */
export function calculateTotalValue(holdings: HoldingForSnapshot[]): number {
  return holdings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Create snapshot
// ---------------------------------------------------------------------------

/**
 * Create a portfolio snapshot for a given date.
 *
 * Calculates total value, broker breakdown, and asset class breakdown,
 * then persists to the PortfolioSnapshot table.
 */
export async function createSnapshot(
  date: Date,
  holdings: HoldingForSnapshot[],
  brokerMap: Record<string, string>, // accountId -> brokerSlug
): Promise<SnapshotResult> {
  const totalValue = calculateTotalValue(holdings);

  // --- Broker breakdown ---
  const brokerBreakdown: Record<string, number> = {};
  for (const holding of holdings) {
    const slug = brokerMap[holding.accountId] ?? holding.brokerSlug;
    brokerBreakdown[slug] = (brokerBreakdown[slug] ?? 0) + (holding.marketValue ?? 0);
  }

  // --- Asset class breakdown ---
  const assetBreakdown: Record<string, number> = {};
  for (const holding of holdings) {
    assetBreakdown[holding.assetClass] =
      (assetBreakdown[holding.assetClass] ?? 0) + (holding.marketValue ?? 0);
  }

  // --- Persist ---
  const currency = 'EUR'; // MVP: single currency

  const snapshot = await prisma.portfolioSnapshot.upsert({
    where: {
      date_currency: { date, currency },
    },
    update: {
      totalValue,
      brokerBreakdown: JSON.stringify(brokerBreakdown),
      assetBreakdown: JSON.stringify(assetBreakdown),
    },
    create: {
      date,
      totalValue,
      currency,
      brokerBreakdown: JSON.stringify(brokerBreakdown),
      assetBreakdown: JSON.stringify(assetBreakdown),
    },
  });

  return {
    id: snapshot.id,
    date: snapshot.date,
    totalValue: snapshot.totalValue,
    currency: snapshot.currency,
    brokerBreakdown,
    assetBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Get historical snapshots
// ---------------------------------------------------------------------------

/**
 * Retrieve portfolio snapshots within a date range, for charting.
 */
export async function getHistoricalSnapshots(
  fromDate: Date,
  toDate: Date,
): Promise<SnapshotResult[]> {
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      date: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  return snapshots.map((s) => ({
    id: s.id,
    date: s.date,
    totalValue: s.totalValue,
    currency: s.currency,
    brokerBreakdown: s.brokerBreakdown
      ? (JSON.parse(s.brokerBreakdown) as Record<string, number>)
      : {},
    assetBreakdown: s.assetBreakdown
      ? (JSON.parse(s.assetBreakdown) as Record<string, number>)
      : {},
  }));
}

// ---------------------------------------------------------------------------
// Get latest snapshot
// ---------------------------------------------------------------------------

/**
 * Retrieve the most recent portfolio snapshot.
 */
export async function getLatestSnapshot(): Promise<SnapshotResult | null> {
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    orderBy: { date: 'desc' },
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    date: snapshot.date,
    totalValue: snapshot.totalValue,
    currency: snapshot.currency,
    brokerBreakdown: snapshot.brokerBreakdown
      ? (JSON.parse(snapshot.brokerBreakdown) as Record<string, number>)
      : {},
    assetBreakdown: snapshot.assetBreakdown
      ? (JSON.parse(snapshot.assetBreakdown) as Record<string, number>)
      : {},
  };
}
