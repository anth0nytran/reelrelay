import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonError } from '@/lib/supabase/route';
import { stripe, getAppUrl } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createRouteClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    // Get the user's billing account
    const adminClient = createServiceRoleClient();
    const { data: billing, error: billingError } = await adminClient
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (billingError || !billing?.stripe_customer_id) {
      return jsonError('No billing account found. Please subscribe first.', 400);
    }

    // Create Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${getAppUrl()}/app/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal error:', error);
    return jsonError('Failed to create portal session', 500);
  }
}
