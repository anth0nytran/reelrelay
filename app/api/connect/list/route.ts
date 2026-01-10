import { type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';
import { PLATFORM_IDS } from '@/lib/platform/registry';
import type { ConnectionStatus } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role client to bypass RLS on connected_accounts table
  const adminClient = createServiceRoleClient();

  // Fetch all connected accounts for user (using service role to bypass RLS)
  const { data: accounts, error } = await adminClient
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to fetch connections:', error);
    return jsonWithCookies(response, { error: 'Failed to fetch connections' }, { status: 500 });
  }

  // Build connection status for each platform
  const connections: ConnectionStatus[] = PLATFORM_IDS.map((platform) => {
    const platformAccounts = (accounts || []).filter(a => a.platform === platform);

    return {
      platform,
      connected: platformAccounts.length > 0,
      accounts: platformAccounts.map(a => ({
        id: a.id,
        name: (a.metadata as Record<string, string>)?.name || a.external_account_id,
        externalId: a.external_account_id,
        isPrimary: a.is_primary || false,
      })),
    };
  });

  return jsonWithCookies(response, { connections });
}
