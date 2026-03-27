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

    // Delete all user data in a transaction to prevent partial deletion
    await prisma.$transaction(async (tx) => {
      // 1. Holdings (depend on Account and ImportBatch)
      const accounts = await tx.account.findMany({ where: { userId }, select: { id: true } });
      const accountIds = accounts.map((a) => a.id);
      if (accountIds.length > 0) {
        await tx.holding.deleteMany({ where: { accountId: { in: accountIds } } });
      }

      // 2. ImportBatches
      await tx.importBatch.deleteMany({ where: { userId } });

      // 3. Accounts
      await tx.account.deleteMany({ where: { userId } });

      // 4. PortfolioSnapshots
      await tx.portfolioSnapshot.deleteMany({ where: { userId } });

      // 5. Taxonomies (cascade: TaxonomyCategory → SecurityCategory)
      const taxonomies = await tx.taxonomy.findMany({ where: { userId }, select: { id: true } });
      const taxonomyIds = taxonomies.map((t) => t.id);
      if (taxonomyIds.length > 0) {
        const categories = await tx.taxonomyCategory.findMany({
          where: { taxonomyId: { in: taxonomyIds } },
          select: { id: true },
        });
        const categoryIds = categories.map((c) => c.id);
        if (categoryIds.length > 0) {
          await tx.securityCategory.deleteMany({ where: { categoryId: { in: categoryIds } } });
        }
        await tx.taxonomyCategory.deleteMany({ where: { taxonomyId: { in: taxonomyIds } } });
      }
      await tx.taxonomy.deleteMany({ where: { userId } });

      // 6. Delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Erro ao apagar conta' }, { status: 500 });
  }
}
