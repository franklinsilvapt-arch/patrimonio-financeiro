import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'country'; // country | sector | factor
    const securityId = searchParams.get('securityId');

    if (type === 'country') {
      const exposures = await prisma.countryExposure.findMany({
        where: securityId ? { securityId } : undefined,
        include: { security: { select: { name: true, ticker: true } } },
        orderBy: { weight: 'desc' },
      });
      return NextResponse.json(exposures);
    }

    if (type === 'sector') {
      const exposures = await prisma.sectorExposure.findMany({
        where: securityId ? { securityId } : undefined,
        include: { security: { select: { name: true, ticker: true } } },
        orderBy: { weight: 'desc' },
      });
      return NextResponse.json(exposures);
    }

    if (type === 'factor') {
      const exposures = await prisma.factorExposure.findMany({
        where: securityId ? { securityId } : undefined,
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
