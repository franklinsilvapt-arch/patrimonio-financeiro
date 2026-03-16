import { NextRequest, NextResponse } from 'next/server';
import { enrichSecurity, enrichAllSecurities } from '@/lib/exposures/enrich';
import { getAuthUserId } from '@/lib/auth/get-user';

/**
 * POST /api/securities/enrich
 *
 * Body options:
 *   { securityId: string }         – enrich a single security
 *   { all: true, force?: boolean } – enrich all ETFs/Funds
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthUserId();
    const body = await request.json();

    if (body.securityId) {
      const result = await enrichSecurity(body.securityId);
      return NextResponse.json(result);
    }

    if (body.all) {
      const results = await enrichAllSecurities(body.force === true);
      const enriched = results.filter(r => r.countriesAdded > 0 || r.sectorsAdded > 0);
      const skipped = results.filter(r => r.source === 'skipped');
      const errors = results.filter(r => r.error);

      return NextResponse.json({
        total: results.length,
        enriched: enriched.length,
        skipped: skipped.length,
        errors: errors.length,
        results,
      });
    }

    return NextResponse.json(
      { error: 'Provide securityId or { all: true }' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('Enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich securities' },
      { status: 500 },
    );
  }
}
