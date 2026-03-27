import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { stripe } from '@/lib/stripe';

export async function POST() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Cancel Stripe subscription if active
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (e) {
        console.error('Failed to cancel Stripe subscription:', e);
      }
    }

    // Delete in order to respect foreign key constraints:
    // 1. Holdings (depend on Account and ImportBatch)
    const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length > 0) {
      await prisma.holding.deleteMany({ where: { accountId: { in: accountIds } } });
    }

    // 2. ImportBatches
    await prisma.importBatch.deleteMany({ where: { userId } });

    // 3. Accounts
    await prisma.account.deleteMany({ where: { userId } });

    // 4. PortfolioSnapshots
    await prisma.portfolioSnapshot.deleteMany({ where: { userId } });

    // 5. Taxonomies (cascade: TaxonomyCategory → SecurityCategory)
    const taxonomies = await prisma.taxonomy.findMany({ where: { userId }, select: { id: true } });
    const taxonomyIds = taxonomies.map((t) => t.id);
    if (taxonomyIds.length > 0) {
      const categories = await prisma.taxonomyCategory.findMany({
        where: { taxonomyId: { in: taxonomyIds } },
        select: { id: true },
      });
      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length > 0) {
        await prisma.securityCategory.deleteMany({ where: { categoryId: { in: categoryIds } } });
      }
      await prisma.taxonomyCategory.deleteMany({ where: { taxonomyId: { in: taxonomyIds } } });
    }
    await prisma.taxonomy.deleteMany({ where: { userId } });

    // 6. Delete the user
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Erro ao apagar conta' }, { status: 500 });
  }
}
