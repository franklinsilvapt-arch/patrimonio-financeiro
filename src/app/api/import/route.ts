import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { getImporter } from '@/lib/importers';
import { findMatchingSecurity, normalizeSecurityName } from '@/lib/normalization';
import { enrichSecurity } from '@/lib/exposures/enrich';
import { fetchLatestRates, convertCurrency } from '@/lib/currency/ecb';

export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const batches = await prisma.importBatch.findMany({
      where: { userId },
      include: { broker: true },
      orderBy: { importedAt: 'desc' },
    });
    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching import batches:', error);
    return NextResponse.json({ error: 'Failed to fetch imports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { content, brokerSlug, fileName, accountName } = await request.json();
    if (!content || !brokerSlug) {
      return NextResponse.json({ error: 'Content and brokerSlug required' }, { status: 400 });
    }

    const importer = getImporter(brokerSlug);
    if (!importer) {
      return NextResponse.json({ error: `Unknown broker: ${brokerSlug}` }, { status: 400 });
    }

    // Find or create broker
    let broker = await prisma.broker.findUnique({ where: { slug: brokerSlug } });
    if (!broker) {
      const brokerNames: Record<string, string> = {
        degiro: 'DEGIRO',
        ibkr: 'Interactive Brokers',
        lightyear: 'Lightyear',
        trading212: 'Trading 212',
        investing: 'Investing.com',
      };
      broker = await prisma.broker.create({
        data: { name: brokerNames[brokerSlug] || brokerSlug, slug: brokerSlug },
      });
    }

    // Find or create account (use accountName for IBKR personal vs business)
    const acctName = accountName || 'Principal';
    let account = await prisma.account.findFirst({
      where: { brokerId: broker.id, name: acctName, userId },
    });
    const expectedType = acctName.toLowerCase().includes('empresarial') ? 'business' : 'personal';
    if (!account) {
      account = await prisma.account.create({
        data: { brokerId: broker.id, name: acctName, currency: 'EUR', accountType: expectedType, userId },
      });
    } else if (account.accountType !== expectedType) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: { accountType: expectedType },
      });
    }

    // Delete all existing holdings for this account (snapshot replacement)
    await prisma.holding.deleteMany({
      where: { accountId: account.id },
    });

    // Parse the CSV
    const result = await importer.parseCSV(content);

    // Create import batch
    const batch = await prisma.importBatch.create({
      data: {
        brokerId: broker.id,
        userId,
        fileName: fileName || `${brokerSlug}_import.csv`,
        referenceDate: result.referenceDate,
        status: 'PROCESSING',
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        warnings: result.warnings.length > 0 ? JSON.stringify(result.warnings) : null,
      },
    });

    // Get existing securities for matching
    const existingSecurities = await prisma.security.findMany({
      select: { id: true, isin: true, ticker: true, normalizedName: true, exchange: true },
    });

    // Fetch ECB rates for currency conversion
    const ecbRates = await fetchLatestRates();
    const rates = ecbRates?.rates ?? { EUR: 1, USD: 1.08 }; // fallback

    let imported = 0;
    let failed = 0;
    const importErrors: string[] = [...result.errors];

    for (const position of result.positions) {
      try {
        // Find or create security
        const match = findMatchingSecurity(
          {
            isin: position.isin || undefined,
            ticker: position.ticker || undefined,
            exchange: position.exchange || undefined,
            name: position.name,
            currency: position.currency,
          },
          existingSecurities
        );

        let securityId: string;

        if (match.securityId && match.matchType !== 'new') {
          securityId = match.securityId;
        } else {
          // Create new security
          const newSecurity = await prisma.security.create({
            data: {
              isin: position.isin,
              ticker: position.ticker,
              name: position.name,
              assetClass: position.assetClass,
              currency: position.currency,
              exchange: position.exchange,
              normalizedName: normalizeSecurityName(position.name),
              dataSource: `${brokerSlug}_import`,
            },
          });
          securityId = newSecurity.id;
          // Add to existing securities for subsequent matching
          existingSecurities.push({
            id: newSecurity.id,
            isin: newSecurity.isin,
            ticker: newSecurity.ticker,
            normalizedName: newSecurity.normalizedName,
            exchange: newSecurity.exchange,
          });
        }

        // Convert to EUR if needed
        const originalCurrency = position.currency;
        let marketValueEUR = position.marketValue;
        let priceEUR = position.price;
        if (originalCurrency && originalCurrency !== 'EUR') {
          marketValueEUR = convertCurrency(position.marketValue ?? 0, originalCurrency, 'EUR', rates);
          if (position.price) {
            priceEUR = convertCurrency(position.price, originalCurrency, 'EUR', rates);
          }
        }

        // Create holding (always in EUR)
        await prisma.holding.create({
          data: {
            accountId: account.id,
            securityId,
            importBatchId: batch.id,
            quantity: position.quantity,
            marketValue: marketValueEUR,
            currency: 'EUR',
            positionDate: position.positionDate || new Date(),
            priceAtPosition: priceEUR,
            priceDate: position.priceDate || position.positionDate || new Date(),
            priceSource: `${brokerSlug}_export`,
          },
        });

        // Create price snapshot if we have a price
        if (position.price) {
          await prisma.priceSnapshot.upsert({
            where: {
              securityId_date_source: {
                securityId,
                date: position.priceDate || position.positionDate || new Date(),
                source: `${brokerSlug}_export`,
              },
            },
            update: { price: position.price },
            create: {
              securityId,
              price: position.price,
              currency: position.currency,
              date: position.priceDate || position.positionDate || new Date(),
              source: `${brokerSlug}_export`,
            },
          });
        }

        imported++;
      } catch (err) {
        failed++;
        importErrors.push(`Error importing ${position.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Update batch
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        rowsImported: imported,
        rowsFailed: failed,
        status: failed === result.positions.length ? 'FAILED' : 'COMPLETED',
        errors: importErrors.length > 0 ? JSON.stringify(importErrors) : null,
      },
    });

    // Auto-enrich ETFs/Funds in background (don't await – fire & forget)
    const etfSecurityIds = new Set<string>();
    for (const position of result.positions) {
      if (position.assetClass === 'ETF' || position.assetClass === 'FUND') {
        const match = findMatchingSecurity(
          {
            isin: position.isin || undefined,
            ticker: position.ticker || undefined,
            exchange: position.exchange || undefined,
            name: position.name,
            currency: position.currency,
          },
          existingSecurities,
        );
        if (match.securityId) {
          etfSecurityIds.add(match.securityId);
        }
      }
    }

    if (etfSecurityIds.size > 0) {
      // Fire and forget – enrich ETFs with JustETF data
      (async () => {
        for (const secId of etfSecurityIds) {
          try {
            await enrichSecurity(secId);
            // Rate limit: 1s between requests
            await new Promise(r => setTimeout(r, 1000));
          } catch (e) {
            console.error(`Auto-enrich failed for ${secId}:`, e);
          }
        }
      })();
    }

    // Auto-create portfolio snapshot after import
    try {
      const allHoldings = await prisma.holding.findMany({
        where: { account: { userId } },
        include: {
          account: { include: { broker: true } },
          security: true,
        },
      });
      // Deduplicate: keep most recent per security+account
      const latest = new Map<string, typeof allHoldings[0]>();
      for (const h of allHoldings) {
        const key = `${h.securityId}_${h.accountId}`;
        const existing = latest.get(key);
        if (!existing || h.positionDate > existing.positionDate) {
          latest.set(key, h);
        }
      }
      const active = Array.from(latest.values());
      const snapshotTotal = active.reduce((sum, h) => sum + (h.marketValue || 0), 0);
      const brokerBreakdown: Record<string, number> = {};
      const assetBreakdown: Record<string, number> = {};
      let personalValue = 0;
      let businessValue = 0;
      for (const h of active) {
        const mv = h.marketValue || 0;
        const bName = h.account.broker.name;
        brokerBreakdown[bName] = (brokerBreakdown[bName] || 0) + mv;
        const cls = h.security.assetClass;
        assetBreakdown[cls] = (assetBreakdown[cls] || 0) + mv;
        if (h.account.accountType === 'business') {
          businessValue += mv;
        } else {
          personalValue += mv;
        }
      }
      const snapshotDate = result.referenceDate || new Date();
      snapshotDate.setHours(0, 0, 0, 0);
      await prisma.portfolioSnapshot.upsert({
        where: { userId_date_currency: { userId, date: snapshotDate, currency: 'EUR' } },
        update: {
          totalValue: snapshotTotal,
          personalValue,
          businessValue,
          brokerBreakdown: JSON.stringify(brokerBreakdown),
          assetBreakdown: JSON.stringify(assetBreakdown),
        },
        create: {
          userId,
          date: snapshotDate,
          totalValue: snapshotTotal,
          personalValue,
          businessValue,
          currency: 'EUR',
          brokerBreakdown: JSON.stringify(brokerBreakdown),
          assetBreakdown: JSON.stringify(assetBreakdown),
        },
      });
    } catch (snapErr) {
      console.error('Failed to create auto-snapshot:', snapErr);
    }

    return NextResponse.json({
      batchId: batch.id,
      imported,
      failed,
      total: result.positions.length,
      errors: importErrors,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json({ error: 'Failed to process import' }, { status: 500 });
  }
}
