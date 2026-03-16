import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Delete snapshots for dates that don't match user's spreadsheet
  // Valid dates from spreadsheet: 2024-10-31, 2025-01-01, 2025-01-31, 2025-02-28, 2025-03-31, 2025-04-30, 2025-05-31, 2025-06-30, 2025-09-30, 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28
  // Remove: 2025-07-30, 2025-07-31, 2025-08-30, 2025-08-31, 2026-03-10, 2026-03-15
  const datesToDelete = [
    '2025-07-30', '2025-07-31', '2025-08-30', '2025-08-31', '2026-03-10', '2026-03-15'
  ];
  for (const d of datesToDelete) {
    const result = await prisma.portfolioSnapshot.deleteMany({
      where: { date: new Date(d) }
    });
    if (result.count > 0) console.log(`Deleted ${d}: ${result.count}`);
  }
  const remaining = await prisma.portfolioSnapshot.findMany({ orderBy: { date: 'asc' } });
  console.log(`\nRemaining: ${remaining.length} snapshots`);
  for (const s of remaining) {
    console.log(`${s.date.toISOString().slice(0,10)} | ${s.totalValue.toFixed(2)}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
