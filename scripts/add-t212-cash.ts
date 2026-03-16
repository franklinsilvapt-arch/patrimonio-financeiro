import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // Check if Trading 212 broker exists
  let broker = await p.broker.findUnique({ where: { slug: 'trading212' } });
  console.log('Broker:', broker?.id, broker?.name);

  if (!broker) {
    broker = await p.broker.create({ data: { name: 'Trading 212', slug: 'trading212' } });
    console.log('Created broker:', broker.id);
  }

  // Find or create account
  let account = await p.account.findUnique({
    where: { brokerId_name: { brokerId: broker.id, name: 'Principal' } },
  });
  if (!account) {
    account = await p.account.create({
      data: { brokerId: broker.id, name: 'Principal', currency: 'EUR', accountType: 'personal' },
    });
    console.log('Created account:', account.id);
  } else {
    console.log('Account:', account.id);
  }

  // Find or create CASH security for Trading 212
  let security = await p.security.findFirst({
    where: { name: 'Cash Trading 212' },
  });
  if (!security) {
    security = await p.security.create({
      data: {
        name: 'Cash Trading 212',
        assetClass: 'CASH',
        currency: 'EUR',
        dataSource: 'manual',
      },
    });
    console.log('Created security:', security.id);
  } else {
    console.log('Security:', security.id);
  }

  // Delete existing holdings for this account
  const deleted = await p.holding.deleteMany({ where: { accountId: account.id } });
  console.log('Deleted old holdings:', deleted.count);

  // Create cash holding: 21,967.22€ at 28/02/2026
  const holding = await p.holding.create({
    data: {
      accountId: account.id,
      securityId: security.id,
      quantity: 21967.22,
      marketValue: 21967.22,
      currency: 'EUR',
      positionDate: new Date('2026-02-28'),
      priceAtPosition: 1,
      priceDate: new Date('2026-02-28'),
      priceSource: 'manual',
    },
  });
  console.log('Created holding:', holding.id, '21967.22 EUR');
}

main().catch(console.error).finally(() => p.$disconnect());
