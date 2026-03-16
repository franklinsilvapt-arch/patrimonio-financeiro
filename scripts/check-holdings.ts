import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const holdings = await p.holding.findMany({
    include: { account: { include: { broker: true } }, security: true },
  });

  // Deduplicate: keep most recent per security+account
  const latest = new Map<string, typeof holdings[0]>();
  for (const h of holdings) {
    const key = `${h.securityId}_${h.accountId}`;
    const ex = latest.get(key);
    if (!ex || h.positionDate > ex.positionDate) latest.set(key, h);
  }

  let total = 0;
  const rows: Array<{ broker: string; acct: string; name: string; mv: number; date: string }> = [];
  for (const h of latest.values()) {
    const mv = h.marketValue || 0;
    total += mv;
    rows.push({
      broker: h.account.broker.name,
      acct: h.account.name,
      name: h.security.name,
      mv,
      date: h.positionDate.toISOString().slice(0, 10),
    });
  }

  rows.sort((a, b) => b.mv - a.mv);
  for (const r of rows) {
    console.log(
      `${r.broker.padEnd(22)} ${r.acct.padEnd(14)} ${r.name.substring(0, 30).padEnd(32)} ${r.mv.toFixed(2).padStart(12)}  ${r.date}`
    );
  }
  console.log(`\nTotal: ${total.toFixed(2)}`);
}

main().catch(console.error).finally(() => p.$disconnect());
