import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.customer) {
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: session.customer as string },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'plus',
              stripeSubscriptionId: session.subscription as string,
            },
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (user) {
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: isActive ? 'plus' : 'free',
            stripeSubscriptionId: isActive ? subscription.id : null,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
