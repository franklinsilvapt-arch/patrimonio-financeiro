import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const snaps = await prisma.portfolioSnapshot.findMany({ orderBy: { date: 'asc' } });
  console.log(`Total: ${snaps.length} snapshots`);
  for (const s of snaps) {
    console.log(`${s.date.toISOString().slice(0,10)} | ${s.totalValue.toFixed(2)}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
