import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { brokerSlug, accountName } = await request.json();

    if (!brokerSlug) {
      return NextResponse.json({ error: 'brokerSlug is required' }, { status: 400 });
    }

    const broker = await prisma.broker.findUnique({ where: { slug: brokerSlug } });
    if (!broker) {
      return NextResponse.json({ cleared: 0 });
    }

    // Find the account
    const targetName = accountName || 'Principal';
    const account = await prisma.account.findFirst({
      where: { brokerId: broker.id, userId, name: targetName },
    });

    if (!account) {
      return NextResponse.json({ cleared: 0 });
    }

    // Delete all holdings for this account
    const result = await prisma.holding.deleteMany({
      where: { accountId: account.id },
    });

    return NextResponse.json({ cleared: result.count, account: account.name, broker: broker.name });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('Error clearing holdings:', error);
    return NextResponse.json({ error: 'Erro ao limpar posições' }, { status: 500 });
  }
}
