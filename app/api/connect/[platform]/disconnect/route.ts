import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';

const DisconnectSchema = z.object({
  accountId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform as PlatformId;
  const { supabase, response } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = DisconnectSchema.safeParse(body);
    const accountId = parsed.success ? parsed.data.accountId : undefined;

    let query = supabase
      .from('connected_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to disconnect:', error);
      return jsonWithCookies(response, { error: 'Failed to disconnect' }, { status: 500 });
    }

    return jsonWithCookies(response, { success: true });
  } catch (err) {
    console.error('Disconnect API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
