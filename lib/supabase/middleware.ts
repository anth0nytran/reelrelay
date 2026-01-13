import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // If env vars are missing, just pass through
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Refresh the session if it exists
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /app routes - redirect to login if not authenticated
  const isAppRoute = request.nextUrl.pathname.startsWith('/app');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isBillingPage = request.nextUrl.pathname === '/app/billing';

  if (isAppRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/app/posts', request.url));
  }

  // Check billing status for /app routes (except billing page itself)
  if (isAppRoute && user && !isBillingPage) {
    const { data: billing, error: billingError } = await supabase
      .from('billing_accounts')
      .select('status, trial_ends_at')
      .eq('user_id', user.id)
      .single();

    // If no billing account exists, allow access (the trigger should create one on signup)
    // This prevents new users from being locked out if the trigger fails
    if (billingError || !billing) {
      // Log but don't block - billing account will be created on first checkout attempt
      console.log('No billing account for user, allowing access:', user.id);
      return response;
    }

    const isActive = billing.status === 'active';
    const isTrialing = billing.status === 'trialing';
    const trialEndsAt = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;
    const now = new Date();
    const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;

    // If not active and (not trialing OR trial expired), redirect to billing
    if (!isActive && (!isTrialing || isTrialExpired)) {
      const billingUrl = new URL('/app/billing', request.url);
      billingUrl.searchParams.set('reason', 'trial_expired');
      return NextResponse.redirect(billingUrl);
    }
  }

  return response;
}
