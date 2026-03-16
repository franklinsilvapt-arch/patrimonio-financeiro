import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { normalizeToBase100 } from '@/lib/benchmark';

/**
 * Compare portfolio performance against a benchmark (IWDA/MSCI World).
 * Uses portfolio snapshots and IWDA price snapshots.
 */
export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    // Get portfolio snapshots
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    if (snapshots.length === 0) {
      return NextResponse.json({ comparison: [], benchmarkName: 'MSCI World (IWDA)' });
    }

    // Find IWDA security for benchmark
    const iwda = await prisma.security.findFirst({
      where: {
        OR: [
          { isin: 'IE00B4L5Y983' },
          { ticker: 'IWDA' },
        ],
      },
    });

    let benchmarkPrices: Array<{ date: string; close: number }> = [];

    if (iwda) {
      const prices = await prisma.priceSnapshot.findMany({
        where: { securityId: iwda.id },
        orderBy: { date: 'asc' },
      });
      benchmarkPrices = prices.map((p) => ({
        date: p.date.toISOString().split('T')[0],
        close: p.price,
      }));
    }

    // If we don't have price history, use holdings market value as proxy
    if (benchmarkPrices.length === 0 && iwda) {
      const holdings = await prisma.holding.findMany({
        where: { securityId: iwda.id },
        orderBy: { positionDate: 'asc' },
        select: { positionDate: true, priceAtPosition: true, marketValue: true, quantity: true },
      });

      benchmarkPrices = holdings
        .filter((h) => h.priceAtPosition)
        .map((h) => ({
          date: h.positionDate.toISOString().split('T')[0],
          close: h.priceAtPosition!,
        }));
    }

    const portfolioData = snapshots.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      value: s.totalValue,
    }));

    const comparison = normalizeToBase100(portfolioData, benchmarkPrices);

    return NextResponse.json({
      comparison,
      benchmarkName: 'MSCI World (IWDA)',
      portfolioSnapshots: snapshots.length,
      benchmarkPoints: benchmarkPrices.length,
    });
  } catch (error) {
    console.error('Error comparing benchmark:', error);
    return NextResponse.json({ error: 'Failed to compare benchmark' }, { status: 500 });
  }
}
