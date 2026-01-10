import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export function createRouteClient(request: NextRequest) {
  const response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...(options as any) });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...(options as any), maxAge: 0 });
      },
    },
  });

  return { supabase, response };
}

/**
 * Creates a Supabase client with service role key.
 * This bypasses RLS and should ONLY be used for server-side operations
 * that need to access tables like oauth_states and connected_accounts.
 * 
 * IMPORTANT: Never expose service role key to the client!
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonWithCookies(
  base: NextResponse,
  body: unknown,
  init?: Parameters<typeof NextResponse.json>[1]
) {
  const res = NextResponse.json(body, init);
  for (const cookie of base.cookies.getAll()) {
    res.cookies.set(cookie);
  }
  return res;
}


