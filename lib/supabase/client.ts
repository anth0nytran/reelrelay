import { createBrowserClient, serialize } from '@supabase/ssr';

let browserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined;

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return undefined;
  const value = match.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : undefined;
}

function setCookie(name: string, value: string, options: Record<string, any>) {
  if (typeof document === 'undefined') return;
  document.cookie = serialize(name, value, { path: '/', ...options });
}

function removeCookie(name: string, options: Record<string, any>) {
  if (typeof document === 'undefined') return;
  document.cookie = serialize(name, '', { path: '/', ...options, maxAge: 0 });
}

export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  browserClient = createBrowserClient(url, anonKey, {
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie,
    },
  });

  return browserClient;
}




