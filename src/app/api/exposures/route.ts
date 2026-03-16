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
    const type = searchParams.get('type') || 'country'; // country | sector | factor
    const securityId = searchParams.get('securityId');

    // Get security IDs that belong to user's holdings
    const userSecurityIds = await prisma.holding.findMany({
      where: { account: { userId } },
      select: { securityId: true },
      distinct: ['securityId'],
    });
    const allowedSecurityIds = userSecurityIds.map((h) => h.securityId);

    // If a specific securityId is requested, verify it belongs to user
    if (securityId && !allowedSecurityIds.includes(securityId)) {
      return NextResponse.json({ error: 'Security not found' }, { status: 404 });
    }

    const whereClause = securityId
      ? { securityId }
      : { securityId: { in: allowedSecurityIds } };

    if (type === 'country') {
      const exposures = await prisma.countryExposure.findMany({
        where: whereClause,
        include: { security: { select: { name: true, ticker: true } } },
        orderBy: { weight: 'desc' },
      });
      return NextResponse.json(exposures);
    }

    if (type === 'sector') {
      const exposures = await prisma.sectorExposure.findMany({
        where: whereClause,
        include: { security: { select: { name: true, ticker: true } } },
        orderBy: { weight: 'desc' },
      });
      return NextResponse.json(exposures);
    }

    if (type === 'factor') {
      const exposures = await prisma.factorExposure.findMany({
        where: whereClause,
        include: { security: { select: { name: true, ticker: true } } },
        orderBy: { factor: 'asc' },
      });
      return NextResponse.json(exposures);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching exposures:', error);
    return NextResponse.json({ error: 'Failed to fetch exposures' }, { status: 500 });
  }
}
