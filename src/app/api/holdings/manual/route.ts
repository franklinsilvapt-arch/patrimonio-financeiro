import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { findMatchingSecurity, normalizeSecurityName } from '@/lib/normalization';

interface ManualPosition {
  name: string;
  ticker?: string;
  isin?: string;
  quantity: number;
  price?: number;
  marketValue?: number;
  currency: string;
  assetClass?: string;
  brokerSlug: string;
  accountName?: string;
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body: ManualPosition = await request.json();

    if (!body.name || !body.quantity || !body.brokerSlug || !body.currency) {
      return NextResponse.json(
        { error: 'Nome, quantidade, moeda e corretora são obrigatórios' },
        { status: 400 }
      );
    }

    // Find or create broker
    let broker = await prisma.broker.findUnique({ where: { slug: body.brokerSlug } });
    if (!broker) {
      const brokerNames: Record<string, string> = {
        activobank: 'ActivoBank',
        bancoctt: 'Banco CTT',
        bankinter: 'Bankinter',
        bpi: 'BPI',
        caixageral: 'Caixa Geral de Depósitos',
        coverflex: 'Coverflex',
        degiro: 'DEGIRO',
        etoro: 'eToro',
        freedom24: 'Freedom24',
        ibkr: 'Interactive Brokers',
        investing: 'Investing.com',
        lightyear: 'Lightyear',
        millenniumbcp: 'Millennium BCP',
        montepio: 'Montepio',
        novobanco: 'Novo Banco',
        revolut: 'Revolut',
        santander: 'Santander',
        traderepublic: 'Trade Republic',
        trading212: 'Trading 212',
        xtb: 'XTB',
      };
      broker = await prisma.broker.create({
        data: { name: brokerNames[body.brokerSlug] || body.brokerSlug, slug: body.brokerSlug },
      });
    }

    // Find or create account for this user (use accountName if provided)
    const targetAccountName = body.accountName || 'Principal';
    let account = await prisma.account.findFirst({
      where: { brokerId: broker.id, userId, name: targetAccountName },
    });
    if (!account) {
      // Fallback: try any account for this broker
      account = await prisma.account.findFirst({ where: { brokerId: broker.id, userId } });
    }
    if (!account) {
      account = await prisma.account.create({
        data: { brokerId: broker.id, name: targetAccountName, currency: 'EUR', userId },
      });
    }

    // Find or create security
    const existingSecurities = await prisma.security.findMany({
      select: { id: true, isin: true, ticker: true, normalizedName: true, exchange: true },
    });

    const match = findMatchingSecurity(
      {
        isin: body.isin || undefined,
        ticker: body.ticker || undefined,
        name: body.name,
        currency: body.currency,
      },
      existingSecurities
    );

    let securityId: string;
    if (match.securityId && match.matchType !== 'new') {
      securityId = match.securityId;
    } else {
      const newSecurity = await prisma.security.create({
        data: {
          isin: body.isin || null,
          ticker: body.ticker || null,
          name: body.name,
          assetClass: (body.assetClass as any) || 'EQUITY',
          currency: body.currency,
          normalizedName: normalizeSecurityName(body.name),
          dataSource: 'manual',
        },
      });
      securityId = newSecurity.id;
    }

    // For CASH positions: delete previous cash holdings for this account so the new value replaces the old
    if (body.assetClass === 'CASH') {
      const existingCashHoldings = await prisma.holding.findMany({
        where: {
          accountId: account.id,
          security: { assetClass: 'CASH' },
        },
        select: { id: true },
      });
      if (existingCashHoldings.length > 0) {
        await prisma.holding.deleteMany({
          where: { id: { in: existingCashHoldings.map(h => h.id) } },
        });
      }
    }

    // Check if a holding for this security already exists in this account — replace it
    const existingHolding = await prisma.holding.findFirst({
      where: { accountId: account.id, securityId },
    });
    if (existingHolding) {
      await prisma.holding.delete({ where: { id: existingHolding.id } });
    }

    // Create import batch for traceability
    const batch = await prisma.importBatch.create({
      data: {
        brokerId: broker.id,
        userId,
        fileName: `manual_${new Date().toISOString().slice(0, 10)}`,
        status: 'COMPLETED',
        rowsImported: 1,
        rowsFailed: 0,
      },
    });

    // Calculate market value if not provided
    const marketValue = body.marketValue ?? (body.price ? body.price * body.quantity : null);

    // Create holding
    const holding = await prisma.holding.create({
      data: {
        accountId: account.id,
        securityId,
        importBatchId: batch.id,
        quantity: body.quantity,
        marketValue,
        currency: body.currency,
        positionDate: new Date(),
        priceAtPosition: body.price ?? null,
        priceDate: body.price ? new Date() : null,
        priceSource: 'manual',
      },
    });

    return NextResponse.json({ success: true, holdingId: holding.id, batchId: batch.id });
  } catch (error) {
    console.error('Error creating manual holding:', error);
    return NextResponse.json({ error: 'Erro ao criar posição manual' }, { status: 500 });
  }
}
