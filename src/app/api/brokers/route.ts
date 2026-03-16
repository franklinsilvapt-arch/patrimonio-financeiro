import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const brokers = await prisma.broker.findMany({
      include: {
        accounts: true,
        _count: { select: { importBatches: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(brokers);
  } catch (error) {
    console.error('Error fetching brokers:', error);
    return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
  }
}
