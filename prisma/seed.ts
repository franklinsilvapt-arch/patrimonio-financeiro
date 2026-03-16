import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Brokers ──────────────────────────────────────────────────────────
  const brokers = await Promise.all(
    [
      { name: 'DEGIRO', slug: 'degiro' },
      { name: 'Interactive Brokers', slug: 'ibkr' },
      { name: 'Lightyear', slug: 'lightyear' },
      { name: 'Trading 212', slug: 'trading212' },
    ].map((b) =>
      prisma.broker.upsert({
        where: { slug: b.slug },
        update: { name: b.name },
        create: b,
      }),
    ),
  );

  const [degiro, ibkr, lightyear, trading212] = brokers;
  console.log(`  Created ${brokers.length} brokers`);

  // ── Accounts ─────────────────────────────────────────────────────────
  const accounts = await Promise.all([
    prisma.account.upsert({
      where: { id: 'acct-degiro' },
      update: {},
      create: { id: 'acct-degiro', brokerId: degiro.id, name: 'DEGIRO Main', currency: 'EUR' },
    }),
    prisma.account.upsert({
      where: { id: 'acct-ibkr' },
      update: {},
      create: { id: 'acct-ibkr', brokerId: ibkr.id, name: 'IBKR Portfolio', currency: 'USD' },
    }),
    prisma.account.upsert({
      where: { id: 'acct-lightyear' },
      update: {},
      create: { id: 'acct-lightyear', brokerId: lightyear.id, name: 'Lightyear Invest', currency: 'EUR' },
    }),
    prisma.account.upsert({
      where: { id: 'acct-trading212' },
      update: {},
      create: { id: 'acct-trading212', brokerId: trading212.id, name: 'Trading 212 ISA', currency: 'EUR' },
    }),
  ]);

  const [acctDegiro, acctIbkr, acctLightyear, acctTrading212] = accounts;
  console.log(`  Created ${accounts.length} accounts`);

  // ── Securities ───────────────────────────────────────────────────────
  const securitiesData = [
    {
      id: 'sec-vwce',
      isin: 'IE00BK5BQT80',
      ticker: 'VWCE',
      name: 'Vanguard FTSE All-World UCITS ETF USD Acc',
      normalizedName: 'vanguard ftse all-world ucits etf usd acc',
      assetClass: 'ETF' as const,
      currency: 'EUR',
      exchange: 'XETRA',
    },
    {
      id: 'sec-iwda',
      isin: 'IE00B4L5Y983',
      ticker: 'IWDA',
      name: 'iShares Core MSCI World UCITS ETF USD Acc',
      normalizedName: 'ishares core msci world ucits etf usd acc',
      assetClass: 'ETF' as const,
      currency: 'EUR',
      exchange: 'AMS',
    },
    {
      id: 'sec-msft',
      isin: 'US5949181045',
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      normalizedName: 'microsoft corp',
      assetClass: 'EQUITY' as const,
      currency: 'USD',
      country: 'United States',
      sector: 'Technology',
      exchange: 'NASDAQ',
    },
    {
      id: 'sec-nesn',
      isin: 'CH0038863350',
      ticker: 'NESN',
      name: 'Nestle SA',
      normalizedName: 'nestle sa',
      assetClass: 'EQUITY' as const,
      currency: 'CHF',
      country: 'Switzerland',
      sector: 'Consumer Staples',
      exchange: 'SWX',
    },
    {
      id: 'sec-aapl',
      isin: 'US0378331005',
      ticker: 'AAPL',
      name: 'Apple Inc',
      normalizedName: 'apple inc',
      assetClass: 'EQUITY' as const,
      currency: 'USD',
      country: 'United States',
      sector: 'Technology',
      exchange: 'NASDAQ',
    },
    {
      id: 'sec-cash-eur',
      isin: null,
      ticker: 'CASH.EUR',
      name: 'Cash EUR',
      normalizedName: 'cash eur',
      assetClass: 'CASH' as const,
      currency: 'EUR',
    },
    {
      id: 'sec-cash-usd',
      isin: null,
      ticker: 'CASH.USD',
      name: 'Cash USD',
      normalizedName: 'cash usd',
      assetClass: 'CASH' as const,
      currency: 'USD',
    },
  ];

  const securities = await Promise.all(
    securitiesData.map((s) =>
      prisma.security.upsert({
        where: { id: s.id },
        update: {
          isin: s.isin,
          ticker: s.ticker,
          name: s.name,
          normalizedName: s.normalizedName,
          assetClass: s.assetClass,
          currency: s.currency,
          country: (s as any).country ?? null,
          sector: (s as any).sector ?? null,
          exchange: (s as any).exchange ?? null,
        },
        create: {
          id: s.id,
          isin: s.isin,
          ticker: s.ticker,
          name: s.name,
          normalizedName: s.normalizedName,
          assetClass: s.assetClass,
          currency: s.currency,
          country: (s as any).country ?? null,
          sector: (s as any).sector ?? null,
          exchange: (s as any).exchange ?? null,
        },
      }),
    ),
  );

  const secMap = Object.fromEntries(securities.map((s) => [s.id, s]));
  console.log(`  Created ${securities.length} securities`);

  // ── Import Batch ─────────────────────────────────────────────────────
  const importBatch = await prisma.importBatch.upsert({
    where: { id: 'batch-seed' },
    update: {},
    create: {
      id: 'batch-seed',
      brokerId: degiro.id,
      fileName: 'seed_data.csv',
      status: 'COMPLETED',
      rowsImported: 13,
      referenceDate: new Date('2026-03-10'),
    },
  });

  // ── Holdings ─────────────────────────────────────────────────────────
  const positionDate = new Date('2026-03-10');
  const priceDate = new Date('2026-03-10');

  const holdingsData = [
    // DEGIRO
    { id: 'h-degiro-vwce', accountId: acctDegiro.id, securityId: 'sec-vwce', quantity: 50, averageCost: 108.00, marketValue: 5765.00, currency: 'EUR', priceAtPosition: 115.30, priceSource: 'seed' },
    { id: 'h-degiro-iwda', accountId: acctDegiro.id, securityId: 'sec-iwda', quantity: 30, averageCost: 75.50, marketValue: 2473.50, currency: 'EUR', priceAtPosition: 82.45, priceSource: 'seed' },
    { id: 'h-degiro-msft', accountId: acctDegiro.id, securityId: 'sec-msft', quantity: 10, averageCost: 380.00, marketValue: 4152.00, currency: 'USD', priceAtPosition: 415.20, priceSource: 'seed' },
    { id: 'h-degiro-cash-eur', accountId: acctDegiro.id, securityId: 'sec-cash-eur', quantity: 500, averageCost: 1.00, marketValue: 500.00, currency: 'EUR', priceAtPosition: 1.00, priceSource: 'seed' },
    // IBKR
    { id: 'h-ibkr-vwce', accountId: acctIbkr.id, securityId: 'sec-vwce', quantity: 25, averageCost: 110.00, marketValue: 2882.50, currency: 'EUR', priceAtPosition: 115.30, priceSource: 'seed' },
    { id: 'h-ibkr-msft', accountId: acctIbkr.id, securityId: 'sec-msft', quantity: 100, averageCost: 350.00, marketValue: 41520.00, currency: 'USD', priceAtPosition: 415.20, priceSource: 'seed' },
    { id: 'h-ibkr-nesn', accountId: acctIbkr.id, securityId: 'sec-nesn', quantity: 20, averageCost: 92.00, marketValue: 1970.00, currency: 'CHF', priceAtPosition: 98.50, priceSource: 'seed' },
    { id: 'h-ibkr-cash-usd', accountId: acctIbkr.id, securityId: 'sec-cash-usd', quantity: 1200, averageCost: 1.00, marketValue: 1200.00, currency: 'USD', priceAtPosition: 1.00, priceSource: 'seed' },
    // Lightyear
    { id: 'h-ly-iwda', accountId: acctLightyear.id, securityId: 'sec-iwda', quantity: 15, averageCost: 78.20, marketValue: 1236.75, currency: 'EUR', priceAtPosition: 82.45, priceSource: 'seed' },
    { id: 'h-ly-aapl', accountId: acctLightyear.id, securityId: 'sec-aapl', quantity: 5, averageCost: 165.00, marketValue: 892.50, currency: 'USD', priceAtPosition: 178.50, priceSource: 'seed' },
    // Trading 212
    { id: 'h-t212-vwce', accountId: acctTrading212.id, securityId: 'sec-vwce', quantity: 10, averageCost: 112.00, marketValue: 1153.00, currency: 'EUR', priceAtPosition: 115.30, priceSource: 'seed' },
    { id: 'h-t212-aapl', accountId: acctTrading212.id, securityId: 'sec-aapl', quantity: 8, averageCost: 160.00, marketValue: 1428.00, currency: 'USD', priceAtPosition: 178.50, priceSource: 'seed' },
    { id: 'h-t212-cash-eur', accountId: acctTrading212.id, securityId: 'sec-cash-eur', quantity: 300, averageCost: 1.00, marketValue: 300.00, currency: 'EUR', priceAtPosition: 1.00, priceSource: 'seed' },
  ];

  const holdings = await Promise.all(
    holdingsData.map((h) =>
      prisma.holding.upsert({
        where: { id: h.id },
        update: {
          quantity: h.quantity,
          averageCost: h.averageCost,
          marketValue: h.marketValue,
          currency: h.currency,
          priceAtPosition: h.priceAtPosition,
          priceSource: h.priceSource,
          positionDate,
          priceDate,
        },
        create: {
          id: h.id,
          accountId: h.accountId,
          securityId: h.securityId,
          importBatchId: importBatch.id,
          quantity: h.quantity,
          averageCost: h.averageCost,
          marketValue: h.marketValue,
          currency: h.currency,
          positionDate,
          priceAtPosition: h.priceAtPosition,
          priceDate,
          priceSource: h.priceSource,
        },
      }),
    ),
  );

  console.log(`  Created ${holdings.length} holdings`);

  // ── Country Exposure ─────────────────────────────────────────────────
  const countryExposureDate = new Date('2026-02-28');
  const countrySource = 'morningstar_manual_2026';

  const vwceCountries = [
    { country: 'US', countryName: 'United States', weight: 0.60 },
    { country: 'JP', countryName: 'Japan', weight: 0.05 },
    { country: 'GB', countryName: 'United Kingdom', weight: 0.04 },
    { country: 'CN', countryName: 'China', weight: 0.03 },
    { country: 'FR', countryName: 'France', weight: 0.03 },
    { country: 'CA', countryName: 'Canada', weight: 0.03 },
    { country: 'CH', countryName: 'Switzerland', weight: 0.02 },
    { country: 'DE', countryName: 'Germany', weight: 0.02 },
    { country: 'AU', countryName: 'Australia', weight: 0.02 },
    { country: 'OT', countryName: 'Other', weight: 0.16 },
  ];

  const iwdaCountries = [
    { country: 'US', countryName: 'United States', weight: 0.70 },
    { country: 'JP', countryName: 'Japan', weight: 0.05 },
    { country: 'GB', countryName: 'United Kingdom', weight: 0.04 },
    { country: 'FR', countryName: 'France', weight: 0.03 },
    { country: 'CA', countryName: 'Canada', weight: 0.03 },
    { country: 'CH', countryName: 'Switzerland', weight: 0.02 },
    { country: 'DE', countryName: 'Germany', weight: 0.02 },
    { country: 'AU', countryName: 'Australia', weight: 0.02 },
    { country: 'OT', countryName: 'Other', weight: 0.09 },
  ];

  // Delete existing country exposures for these securities to allow re-run
  await prisma.countryExposure.deleteMany({
    where: { securityId: { in: ['sec-vwce', 'sec-iwda'] } },
  });

  const countryExposures = await Promise.all(
    [
      ...vwceCountries.map((c) => ({
        securityId: 'sec-vwce',
        ...c,
        date: countryExposureDate,
        source: countrySource,
        confidence: 0.85,
        coverage: 0.95,
      })),
      ...iwdaCountries.map((c) => ({
        securityId: 'sec-iwda',
        ...c,
        date: countryExposureDate,
        source: countrySource,
        confidence: 0.85,
        coverage: 0.95,
      })),
    ].map((ce) => prisma.countryExposure.create({ data: ce })),
  );

  console.log(`  Created ${countryExposures.length} country exposures`);

  // ── Sector Exposure ──────────────────────────────────────────────────
  const vwceSectors = [
    { sector: 'Technology', weight: 0.23 },
    { sector: 'Financials', weight: 0.16 },
    { sector: 'Healthcare', weight: 0.11 },
    { sector: 'Consumer Discretionary', weight: 0.11 },
    { sector: 'Industrials', weight: 0.10 },
    { sector: 'Consumer Staples', weight: 0.07 },
    { sector: 'Energy', weight: 0.05 },
    { sector: 'Communication', weight: 0.04 },
    { sector: 'Utilities', weight: 0.03 },
    { sector: 'Materials', weight: 0.04 },
    { sector: 'Real Estate', weight: 0.03 },
    { sector: 'Other', weight: 0.03 },
  ];

  const iwdaSectors = [
    { sector: 'Technology', weight: 0.25 },
    { sector: 'Financials', weight: 0.15 },
    { sector: 'Healthcare', weight: 0.12 },
    { sector: 'Consumer Discretionary', weight: 0.10 },
    { sector: 'Industrials', weight: 0.11 },
    { sector: 'Consumer Staples', weight: 0.07 },
    { sector: 'Energy', weight: 0.04 },
    { sector: 'Communication', weight: 0.04 },
    { sector: 'Utilities', weight: 0.03 },
    { sector: 'Materials', weight: 0.04 },
    { sector: 'Real Estate', weight: 0.03 },
    { sector: 'Other', weight: 0.02 },
  ];

  await prisma.sectorExposure.deleteMany({
    where: { securityId: { in: ['sec-vwce', 'sec-iwda'] } },
  });

  const sectorExposures = await Promise.all(
    [
      ...vwceSectors.map((s) => ({
        securityId: 'sec-vwce',
        ...s,
        date: countryExposureDate,
        source: countrySource,
        confidence: 0.85,
        coverage: 0.95,
      })),
      ...iwdaSectors.map((s) => ({
        securityId: 'sec-iwda',
        ...s,
        date: countryExposureDate,
        source: countrySource,
        confidence: 0.85,
        coverage: 0.95,
      })),
    ].map((se) => prisma.sectorExposure.create({ data: se })),
  );

  console.log(`  Created ${sectorExposures.length} sector exposures`);

  // ── Factor Exposure ──────────────────────────────────────────────────
  const factorDate = new Date('2026-03-01');
  const factorMethod = 'mock_fundamental_scoring_v1';
  const factorSource = 'seed_data';

  const factorData: Record<string, { factors: Record<string, number>; confidence: number; coverage: number }> = {
    'sec-msft': {
      factors: { value: -0.3, size: 1.0, momentum: 0.6, quality: 0.9, volatility: -0.2, growth: 0.7 },
      confidence: 0.7,
      coverage: 1.0,
    },
    'sec-nesn': {
      factors: { value: 0.4, size: 0.8, momentum: -0.1, quality: 0.7, volatility: -0.5, growth: 0.1 },
      confidence: 0.7,
      coverage: 1.0,
    },
    'sec-aapl': {
      factors: { value: -0.2, size: 1.0, momentum: 0.5, quality: 0.85, volatility: -0.1, growth: 0.6 },
      confidence: 0.7,
      coverage: 1.0,
    },
    'sec-vwce': {
      factors: { value: 0.0, size: 0.3, momentum: 0.2, quality: 0.3, volatility: 0.0, growth: 0.2 },
      confidence: 0.5,
      coverage: 0.9,
    },
    'sec-iwda': {
      factors: { value: -0.1, size: 0.4, momentum: 0.25, quality: 0.35, volatility: -0.05, growth: 0.25 },
      confidence: 0.5,
      coverage: 0.9,
    },
  };

  await prisma.factorExposure.deleteMany({
    where: { securityId: { in: Object.keys(factorData) } },
  });

  const factorExposures = await Promise.all(
    Object.entries(factorData).flatMap(([securityId, { factors, confidence, coverage }]) =>
      Object.entries(factors).map(([factor, score]) =>
        prisma.factorExposure.create({
          data: {
            securityId,
            factor,
            score,
            method: factorMethod,
            date: factorDate,
            source: factorSource,
            confidence,
            coverage,
          },
        }),
      ),
    ),
  );

  console.log(`  Created ${factorExposures.length} factor exposures`);

  // ── Portfolio Snapshots ──────────────────────────────────────────────
  // 12 monthly snapshots: 2025-04 through 2026-03
  const monthlyValues = [
    55000, 55800, 54200, 56500, 57800, 58100,
    57200, 59500, 61000, 60200, 63000, 65173.25,
  ];

  const snapshotMonths = [
    '2025-04-30', '2025-05-31', '2025-06-30', '2025-07-31',
    '2025-08-31', '2025-09-30', '2025-10-31', '2025-11-30',
    '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-10',
  ];

  // Delete existing snapshots to allow re-run
  await prisma.portfolioSnapshot.deleteMany({});

  const snapshots = await Promise.all(
    snapshotMonths.map((dateStr, i) => {
      const totalValue = monthlyValues[i];
      // Broker breakdown ratios shift slightly over time
      const degiroRatio = 0.20 + (i * 0.002);
      const ibkrRatio = 0.55 + (i * 0.005);
      const lightyearRatio = 0.05 - (i * 0.001);
      const trading212Ratio = 1 - degiroRatio - ibkrRatio - lightyearRatio;

      const brokerBreakdown = {
        degiro: Math.round(totalValue * degiroRatio * 100) / 100,
        ibkr: Math.round(totalValue * ibkrRatio * 100) / 100,
        lightyear: Math.round(totalValue * lightyearRatio * 100) / 100,
        trading212: Math.round(totalValue * trading212Ratio * 100) / 100,
      };

      const assetBreakdown = {
        EQUITY: Math.round(totalValue * 0.73 * 100) / 100,
        ETF: Math.round(totalValue * 0.22 * 100) / 100,
        CASH: Math.round(totalValue * 0.05 * 100) / 100,
      };

      return prisma.portfolioSnapshot.create({
        data: {
          date: new Date(dateStr),
          totalValue,
          currency: 'EUR',
          brokerBreakdown: JSON.stringify(brokerBreakdown),
          assetBreakdown: JSON.stringify(assetBreakdown),
        },
      });
    }),
  );

  console.log(`  Created ${snapshots.length} portfolio snapshots`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
