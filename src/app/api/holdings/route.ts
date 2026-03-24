import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const broker = searchParams.get('broker');
    const assetClass = searchParams.get('assetClass');
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    const currency = searchParams.get('currency');
    const scope = searchParams.get('scope');

    // Get the most recent holding for each security+account combination
    const holdings = await prisma.holding.findMany({
      where: {
        account: {
          userId,
          ...(broker && { broker: { slug: broker } }),
          ...(scope && { accountType: scope }),
        },
        ...(assetClass && {
          security: { assetClass: assetClass as any },
        }),
        ...(country && {
          security: { country },
        }),
        ...(sector && {
          security: { sector },
        }),
        ...(currency && { currency }),
      },
      include: {
        security: {
          include: {
            countryExposures: { orderBy: { date: 'desc' } },
            sectorExposures: { orderBy: { date: 'desc' } },
            factorExposures: { orderBy: { date: 'desc' } },
          },
        },
        account: {
          include: { broker: true },
        },
        importBatch: true,
      },
      orderBy: { positionDate: 'desc' },
    });

    // Deduplicate: keep only the most recent holding per security+account
    const latestHoldings = new Map<string, typeof holdings[0]>();
    for (const holding of holdings) {
      const key = `${holding.securityId}_${holding.accountId}`;
      const existing = latestHoldings.get(key);
      if (!existing || holding.positionDate > existing.positionDate) {
        latestHoldings.set(key, holding);
      }
    }

    const result = Array.from(latestHoldings.values());

    // Calculate total value for weights
    const totalValue = result.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    const enriched = result.map((h) => ({
      id: h.id,
      securityId: h.securityId,
      securityName: h.security.name,
      ticker: h.security.ticker,
      isin: h.security.isin,
      assetClass: h.security.assetClass,
      broker: h.account.broker.name,
      brokerSlug: h.account.broker.slug,
      accountName: h.account.name,
      accountType: h.account.accountType,
      quantity: h.quantity,
      price: h.priceAtPosition,
      currency: h.currency,
      marketValue: h.marketValue,
      weight: totalValue > 0 ? (h.marketValue || 0) / totalValue : 0,
      country: h.security.country,
      sector: h.security.sector,
      positionDate: h.positionDate,
      priceDate: h.priceDate,
      priceSource: h.priceSource,
      importDate: h.importBatch?.importedAt || h.createdAt,
      dataSource: h.security.dataSource,
      // Exposure data with dates
      countryExposures: h.security.countryExposures.length > 0
        ? {
            data: h.security.countryExposures,
            date: h.security.countryExposures[0]?.date,
            source: h.security.countryExposures[0]?.source,
            coverage: h.security.countryExposures[0]?.coverage,
          }
        : null,
      sectorExposures: h.security.sectorExposures.length > 0
        ? {
            data: h.security.sectorExposures,
            date: h.security.sectorExposures[0]?.date,
            source: h.security.sectorExposures[0]?.source,
            coverage: h.security.sectorExposures[0]?.coverage,
          }
        : null,
      factorExposures: h.security.factorExposures.length > 0
        ? {
            data: h.security.factorExposures,
            date: h.security.factorExposures[0]?.date,
            source: h.security.factorExposures[0]?.source,
            coverage: h.security.factorExposures[0]?.coverage,
          }
        : null,
    }));

    return NextResponse.json({
      holdings: enriched,
      totalValue,
      count: enriched.length,
    });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}

export async function DELETE() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const result = await prisma.holding.deleteMany({
      where: { account: { userId } },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Error deleting all holdings:', error);
    return NextResponse.json({ error: 'Failed to delete holdings' }, { status: 500 });
  }
}
