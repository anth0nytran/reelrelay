import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/route';
import Stripe from 'stripe';

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs';

async function updateBillingStatus(
  customerId: string,
  updates: {
    status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
    stripe_subscription_id?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  },
  fallbackUserId?: string
) {
  const adminClient = createServiceRoleClient();
  
  // Find user by stripe_customer_id
  let { data: billing, error: findError } = await adminClient
    .from('billing_accounts')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  // Fallback: If customer not found by stripe_customer_id, try by user_id from metadata
  if ((findError || !billing) && fallbackUserId) {
    console.log('Customer not found by stripe_customer_id, trying fallback lookup');
    const fallbackResult = await adminClient
      .from('billing_accounts')
      .select('user_id')
      .eq('user_id', fallbackUserId)
      .single();
    
    if (!fallbackResult.error && fallbackResult.data) {
      billing = fallbackResult.data;
      // Also save the stripe_customer_id for future lookups
      await adminClient
        .from('billing_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', fallbackUserId);
      console.log('Successfully linked stripe_customer_id to user via fallback');
    }
  }

  if (!billing) {
    // Log without exposing full IDs - use prefixes only
    const custPrefix = customerId.substring(0, 12);
    const fallbackPrefix = fallbackUserId ? fallbackUserId.substring(0, 8) : 'none';
    console.error(`Could not find billing account for customer: ${custPrefix}... fallback: ${fallbackPrefix}...`);
    return false;
  }

  const { error: updateError } = await adminClient
    .from('billing_accounts')
    .update(updates)
    .eq('user_id', billing.user_id);

  if (updateError) {
    console.error('Failed to update billing account:', updateError.message);
    return false;
  }

  // Log success without exposing full user ID in production
  const userIdPrefix = billing.user_id.substring(0, 8);
  console.log(`Successfully updated billing for user ${userIdPrefix}...: status=${updates.status}`);
  return true;
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'paused':
    default:
      return 'unpaid';
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Security: In production, verify we're processing live events
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !event.livemode) {
    console.warn('Received test mode event in production - ignoring');
    return NextResponse.json({ received: true, ignored: 'test_mode' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const customerId = typeof session.customer === 'string' 
            ? session.customer 
            : session.customer.id;
          
          // Get fallback user ID from metadata
          const fallbackUserId = session.metadata?.supabase_user_id;
          
          // Retrieve subscription details
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
          // Cast through unknown to access runtime properties not in newer type definitions
          const sub = subscriptionResponse as unknown as { current_period_end?: number; cancel_at_period_end?: boolean };
          
          const success = await updateBillingStatus(customerId, {
            status: 'active',
            stripe_subscription_id: subscriptionId,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          }, fallbackUserId);
          
          if (!success) {
            console.error('CRITICAL: checkout.session.completed failed to update billing!');
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        // Get fallback user ID from subscription metadata
        const fallbackUserId = subscription.metadata?.supabase_user_id;

        // Access current_period_end safely - it exists at runtime but not in newer type definitions
        const subData = subscription as unknown as { current_period_end?: number; cancel_at_period_end?: boolean };
        
        const success = await updateBillingStatus(customerId, {
          status: mapStripeStatus(subscription.status),
          stripe_subscription_id: subscription.id,
          current_period_end: subData.current_period_end ? new Date(subData.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subData.cancel_at_period_end ?? false,
        }, fallbackUserId);
        
        if (!success) {
          console.error(`CRITICAL: ${event.type} failed to update billing!`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        
        const fallbackUserId = subscription.metadata?.supabase_user_id;

        const success = await updateBillingStatus(customerId, {
          status: 'canceled',
          stripe_subscription_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
        }, fallbackUserId);
        
        if (!success) {
          console.error('CRITICAL: customer.subscription.deleted failed to update billing!');
        }
        break;
      }

      case 'customer.subscription.resumed': {
        // Handle subscription resuming after pause
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        
        const fallbackUserId = subscription.metadata?.supabase_user_id;
        const subData = subscription as unknown as { current_period_end?: number; cancel_at_period_end?: boolean };

        await updateBillingStatus(customerId, {
          status: 'active',
          stripe_subscription_id: subscription.id,
          current_period_end: subData.current_period_end ? new Date(subData.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subData.cancel_at_period_end ?? false,
        }, fallbackUserId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer.id;

          await updateBillingStatus(customerId, {
            status: 'past_due',
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // subscription_id is the string ID on the invoice - cast through unknown for runtime access
        const invoiceSubscriptionId = (invoice as unknown as { subscription?: string | null }).subscription;
        
        if (invoice.customer && invoiceSubscriptionId) {
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer.id;
          
          const subscriptionResponse = await stripe.subscriptions.retrieve(invoiceSubscriptionId);
          const sub = subscriptionResponse as unknown as { current_period_end?: number; metadata?: { supabase_user_id?: string } };
          const fallbackUserId = sub.metadata?.supabase_user_id;

          const success = await updateBillingStatus(customerId, {
            status: 'active',
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          }, fallbackUserId);
          
          if (!success) {
            console.error('CRITICAL: invoice.paid failed to update billing!');
          }
        }
        break;
      }

      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
