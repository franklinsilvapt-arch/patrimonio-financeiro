import { NextRequest, NextResponse } from 'next/server';
import { getImporter } from '@/lib/importers';

export async function POST(request: NextRequest) {
  try {
    const { content, brokerSlug } = await request.json();
    if (!content || !brokerSlug) {
      return NextResponse.json({ error: 'Content and brokerSlug required' }, { status: 400 });
    }

    const importer = getImporter(brokerSlug);
    if (!importer) {
      return NextResponse.json({ error: `Unknown broker: ${brokerSlug}` }, { status: 400 });
    }

    const result = await importer.parseCSV(content);

    return NextResponse.json({
      positions: result.positions.map((p) => ({
        name: p.name,
        ticker: p.ticker,
        isin: p.isin,
        quantity: p.quantity,
        price: p.price,
        marketValue: p.marketValue,
        currency: p.currency,
        assetClass: p.assetClass,
        positionDate: p.positionDate,
      })),
      errors: result.errors,
      warnings: result.warnings,
      referenceDate: result.referenceDate,
      totalPositions: result.positions.length,
    });
  } catch (error) {
    console.error('Error previewing import:', error);
    return NextResponse.json({ error: 'Failed to preview import' }, { status: 500 });
  }
}
