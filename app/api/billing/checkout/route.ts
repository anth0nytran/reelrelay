import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonError } from '@/lib/supabase/route';
import { stripe, getAppUrl } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createRouteClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    // Parse and validate request body for billing interval preference
    let interval: 'month' | 'year' = 'month';
    try {
      const body = await request.json();
      // Strict validation - only accept exact values
      if (body.interval === 'year') {
        interval = 'year';
      } else if (body.interval === 'month') {
        interval = 'month';
      }
      // Any other value defaults to 'month' (already set)
    } catch {
      // Default to monthly if no body or invalid JSON
    }

    // Get the user's billing account
    const adminClient = createServiceRoleClient();
    let { data: billing, error: billingError } = await adminClient
      .from('billing_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (billingError || !billing) {
      // Create billing account if missing (shouldn't happen with trigger, but safety net)
      console.log('Creating billing account for user:', user.id);
      const { error: insertError } = await adminClient.from('billing_accounts').insert({
        user_id: user.id,
        status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      if (insertError) {
        console.error('Failed to create billing account:', insertError);
        return jsonError('Failed to create billing account', 500);
      }
      
      // Re-fetch the billing account
      const refetch = await adminClient
        .from('billing_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      billing = refetch.data;
    }

    // If already active, redirect to portal instead
    if (billing?.status === 'active' && billing?.stripe_customer_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: billing.stripe_customer_id,
        return_url: `${getAppUrl()}/app/billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // Create or retrieve Stripe customer
    let customerId = billing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await adminClient
        .from('billing_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Get the appropriate price ID
    const priceId = interval === 'year'
      ? process.env.STRIPE_PRICE_ID_YEARLY
      : process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      console.error(`Missing STRIPE_PRICE_ID_${interval.toUpperCase()} environment variable`);
      return jsonError('Billing configuration error. Please contact support.', 500);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${getAppUrl()}/app/billing?success=true`,
      cancel_url: `${getAppUrl()}/app/billing?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return jsonError('Failed to create checkout session', 500);
  }
}
