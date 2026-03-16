import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const result = snapshots.map((s) => {
      const brokerData = s.brokerBreakdown ? JSON.parse(s.brokerBreakdown) as Record<string, number> : {};
      return {
        id: s.id,
        date: s.date,
        createdAt: s.date, // alias for history page compatibility
        totalValue: s.totalValue,
        currency: s.currency,
        brokerCount: Object.keys(brokerData).length,
        brokerBreakdown: brokerData,
        assetBreakdown: s.assetBreakdown ? JSON.parse(s.assetBreakdown) : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}

export async function POST() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    // Get current holdings
    const holdings = await prisma.holding.findMany({
      where: { account: { userId } },
      include: {
        security: true,
        account: { include: { broker: true } },
      },
      orderBy: { positionDate: 'desc' },
    });

    // Deduplicate
    const latestHoldings = new Map<string, typeof holdings[0]>();
    for (const holding of holdings) {
      const key = `${holding.securityId}_${holding.accountId}`;
      const existing = latestHoldings.get(key);
      if (!existing || holding.positionDate > existing.positionDate) {
        latestHoldings.set(key, holding);
      }
    }

    const active = Array.from(latestHoldings.values());
    const totalValue = active.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // Broker breakdown
    const brokerBreakdown: Record<string, number> = {};
    for (const h of active) {
      const name = h.account.broker.name;
      brokerBreakdown[name] = (brokerBreakdown[name] || 0) + (h.marketValue || 0);
    }

    // Asset class breakdown
    const assetBreakdown: Record<string, number> = {};
    for (const h of active) {
      const cls = h.security.assetClass;
      assetBreakdown[cls] = (assetBreakdown[cls] || 0) + (h.marketValue || 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await prisma.portfolioSnapshot.upsert({
      where: { userId_date_currency: { userId, date: today, currency: 'EUR' } },
      update: {
        totalValue,
        brokerBreakdown: JSON.stringify(brokerBreakdown),
        assetBreakdown: JSON.stringify(assetBreakdown),
      },
      create: {
        userId,
        date: today,
        totalValue,
        currency: 'EUR',
        brokerBreakdown: JSON.stringify(brokerBreakdown),
        assetBreakdown: JSON.stringify(assetBreakdown),
      },
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
