import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Raw spreadsheet data
// ---------------------------------------------------------------------------

const dates = [
  '2024-10-31',
  '2025-01-01',
  '2025-01-31',
  '2025-02-28',
  '2025-03-31',
  '2025-04-30',
  '2025-05-31',
  '2025-06-30',
  '2025-09-30',
  '2025-10-31',
  '2025-11-30',
  '2025-12-31',
  '2026-01-31',
  '2026-02-28',
];

const totals = [
  411562.96, 435979.39, 462150.88, 459577.36, 450207.93, 458086.49,
  483290.52, 495305.58, 536745.99, 570310.15,
  581384.78, 591189.21, 610141.68, 636749.36,
];

// Individual account values per date (index matches dates array)
const accounts: Record<string, number[]> = {
  'Banco CTT': [
    590.80, 1563.52, 7979.46, 3003.77, 1040.24, 1914.24,
    5758.60, 2206.82, 1717.25, 811.54,
    1370.21, 1068.88, 1380.88, 1580.21,
  ],
  'DEGIRO': [
    134148.33, 143409.85, 146887.05, 143666.70, 149147.50, 145693.38,
    152022.13, 153135.38, 167436.37, 178221.44,
    177473.20, 177560.76, 178611.48, 180813.90,
  ],
  'IBKR pessoal': [
    126200.00, 132774.35, 132242.95, 134491.27, 134700.00, 139794.60,
    144682.23, 149924.58, 155984.38, 166400.00,
    175727.00, 175172.78, 181829.66, 189134.34,
  ],
  'Revolut': [
    0, 5.60, 415.18, 47.18, 91.54, 91.54,
    0, 1150.40, 260.57, 342.28,
    949.77, 308.52, 1434.73, 601.51,
  ],
  'Trading 212': [
    10660.48, 11361.33, 24980.63, 37137.35, 20428.98, 20141.72,
    19911.76, 20812.96, 0, 0,
    21293.52, 21272.78, 21286.34, 21967.22,
  ],
  'Lightyear pessoal': [
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
    200.00, 0, 0, 0,
  ],
  'N26': [
    300.00, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ],
  'Freedom24': [
    0, 0, 0, 0, 192.55, 192.55,
    192.55, 0, 204.00, 204.00,
    204.35, 204.95, 207.01, 212.30,
  ],
  'eToro': [
    70.00, 70.00, 70.00, 70.00, 70.00, 70.00,
    70.00, 70.00, 70.00, 70.00,
    70.00, 70.00, 70.00, 70.00,
  ],
  'Vivid': [
    269.97, 2172.59, 2505.14, 1552.69, 5.04, 32.01,
    0, 7.00, 0, 0,
    0, 0, 0, 0,
  ],
  'XTB': [
    0, 500.07, 0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ],
  'ActivoBank': [
    0, 0, 0, 0, 0, 0,
    0, 0, 50.00, 50.00,
    0, 0, 0, 0,
  ],
  'Bankinter': [
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
    150.40, 0, 0, 0,
  ],
  'IBKR empresa': [
    131023.27, 138324.00, 140388.07, 136959.50, 141354.53, 142163.00,
    143821.63, 162981.98, 185714.00, 194700.00,
    207845.00, 208956.96, 220421.00, 226727.28,
  ],
  'Sub. Alimentação': [
    0, 393.38, 393.38, 462.75, 497.71, 784.54,
    582.60, 774.56, 220.49, 50.91,
    321.98, 164.88, 214.20, 1.48,
  ],
  'Novo Banco empresa': [
    8300.11, 5404.70, 6289.02, 2186.65, 2679.84, 7208.91,
    16249.02, 4042.03, 4054.05, 7197.16,
    3559.56, 5639.47, 4451.38, 5446.48,
  ],
  'Lightyear empresa': [
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 10194.64,
  ],
};

// ---------------------------------------------------------------------------
// Broker grouping: maps account names → broker display name
// ---------------------------------------------------------------------------

const brokerMap: Record<string, string> = {
  'Banco CTT': 'Banco CTT',
  'DEGIRO': 'DEGIRO',
  'IBKR pessoal': 'Interactive Brokers',
  'IBKR empresa': 'Interactive Brokers',
  'Revolut': 'Revolut',
  'Trading 212': 'Trading 212',
  'Lightyear pessoal': 'Lightyear',
  'Lightyear empresa': 'Lightyear',
  'N26': 'N26',
  'Freedom24': 'Freedom24',
  'eToro': 'eToro',
  'Vivid': 'Vivid',
  'XTB': 'XTB',
  'ActivoBank': 'ActivoBank',
  'Bankinter': 'Bankinter',
  'Novo Banco empresa': 'Novo Banco',
  'Sub. Alimentação': 'Sub. Alimentação',
};

// Business accounts (all others are personal)
const businessAccounts = new Set([
  'IBKR empresa',
  'Sub. Alimentação',
  'Novo Banco empresa',
  'Lightyear empresa',
]);

// ---------------------------------------------------------------------------
// Build broker breakdown for a given date index
// ---------------------------------------------------------------------------

function buildBrokerBreakdown(dateIndex: number): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const [account, values] of Object.entries(accounts)) {
    const value = values[dateIndex] ?? 0;
    if (value <= 0) continue;

    const broker = brokerMap[account];
    if (!broker) continue;

    breakdown[broker] = (breakdown[broker] ?? 0) + value;
  }

  return breakdown;
}

function buildScopeTotals(dateIndex: number): { personal: number; business: number } {
  let personal = 0;
  let business = 0;

  for (const [account, values] of Object.entries(accounts)) {
    const value = values[dateIndex] ?? 0;
    if (value <= 0) continue;

    if (businessAccounts.has(account)) {
      business += value;
    } else {
      personal += value;
    }
  }

  return { personal, business };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding ${dates.length} PortfolioSnapshot records…`);

  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i]);
    const totalValue = totals[i];
    const currency = 'EUR';
    const brokerBreakdown = buildBrokerBreakdown(i);
    const scopeTotals = buildScopeTotals(i);

    const result = await prisma.portfolioSnapshot.upsert({
      where: {
        date_currency: { date, currency },
      },
      update: {
        totalValue,
        personalValue: scopeTotals.personal,
        businessValue: scopeTotals.business,
        brokerBreakdown: JSON.stringify(brokerBreakdown),
      },
      create: {
        date,
        totalValue,
        personalValue: scopeTotals.personal,
        businessValue: scopeTotals.business,
        currency,
        brokerBreakdown: JSON.stringify(brokerBreakdown),
      },
    });

    console.log(`  ${dates[i]}  total=${totalValue.toFixed(2)}  id=${result.id}`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
