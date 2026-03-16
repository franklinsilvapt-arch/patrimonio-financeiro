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
    const brokers = await prisma.broker.findMany({
      where: {
        accounts: { some: { userId } },
      },
      include: {
        accounts: { where: { userId } },
        _count: { select: { importBatches: { where: { userId } } } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(brokers);
  } catch (error) {
    console.error('Error fetching brokers:', error);
    return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
  }
}
