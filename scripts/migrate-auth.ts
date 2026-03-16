import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create owner user
  const email = 'franklin.silva.pt@gmail.com';
  const password = 'REDACTED'; // Change this after first login!
  const hashedPassword = await bcrypt.hash(password, 12);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Franklin Carneiro da Silva',
        email,
        hashedPassword,
      },
    });
    console.log('Created owner user:', user.id, user.email);
  } else {
    console.log('Owner user already exists:', user.id, user.email);
  }

  // Assign all accounts to owner
  const accounts = await prisma.account.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log('Assigned accounts:', accounts.count);

  // Assign all import batches to owner
  const batches = await prisma.importBatch.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log('Assigned import batches:', batches.count);

  // Assign all portfolio snapshots to owner
  const snapshots = await prisma.portfolioSnapshot.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log('Assigned portfolio snapshots:', snapshots.count);

  // Assign all taxonomies to owner
  const taxonomies = await prisma.taxonomy.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log('Assigned taxonomies:', taxonomies.count);

  console.log('\nMigration complete! Login with:');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('\n⚠️  Change your password after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
