import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';

const SelectPrimarySchema = z.object({
  accountId: z.string().uuid(),
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
    const body = await request.json();
    const parsed = SelectPrimarySchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input' }, { status: 400 });
    }

    const { accountId } = parsed.data;

    // First, unset all primary flags for this platform
    await supabase
      .from('connected_accounts')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('platform', platform);

    // Set the selected account as primary
    const { error } = await supabase
      .from('connected_accounts')
      .update({ is_primary: true })
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('platform', platform);

    if (error) {
      console.error('Failed to set primary:', error);
      return jsonWithCookies(response, { error: 'Failed to set primary' }, { status: 500 });
    }

    return jsonWithCookies(response, { success: true });
  } catch (err) {
    console.error('Select primary API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
