import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'csv';

  try {
    // Get all latest holdings
    const holdings = await prisma.holding.findMany({
      include: {
        security: true,
        account: { include: { broker: true } },
      },
      orderBy: { positionDate: 'desc' },
    });

    // Deduplicate: keep most recent per security+account
    const latest = new Map<string, typeof holdings[0]>();
    for (const h of holdings) {
      const key = `${h.securityId}_${h.accountId}`;
      const existing = latest.get(key);
      if (!existing || h.positionDate > existing.positionDate) {
        latest.set(key, h);
      }
    }

    const active = Array.from(latest.values());

    if (format === 'csv') {
      const headers = [
        'Corretora', 'Conta', 'Nome', 'Ticker', 'ISIN', 'Classe',
        'Quantidade', 'Preço', 'Valor Mercado', 'Moeda',
        'Data Posição', 'País', 'Setor',
      ];

      const rows = active.map((h) => [
        h.account.broker.name,
        h.account.name,
        h.security.name,
        h.security.ticker || '',
        h.security.isin || '',
        h.security.assetClass,
        h.quantity?.toString() || '',
        h.priceAtPosition?.toString() || '',
        h.marketValue?.toString() || '',
        h.currency,
        h.positionDate?.toISOString().split('T')[0] || '',
        h.security.country || '',
        h.security.sector || '',
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
      ].join('\n');

      // Add BOM for Excel compatibility with UTF-8
      const bom = '\uFEFF';

      return new NextResponse(bom + csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="portfolio_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format (for other tools)
    const totalValue = active.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    const exportData = {
      exportDate: new Date().toISOString(),
      totalValue,
      currency: 'EUR',
      holdingsCount: active.length,
      holdings: active.map((h) => ({
        broker: h.account.broker.name,
        account: h.account.name,
        name: h.security.name,
        ticker: h.security.ticker,
        isin: h.security.isin,
        assetClass: h.security.assetClass,
        quantity: h.quantity,
        price: h.priceAtPosition,
        marketValue: h.marketValue,
        currency: h.currency,
        positionDate: h.positionDate?.toISOString().split('T')[0],
        country: h.security.country,
        sector: h.security.sector,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="portfolio_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting portfolio:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
