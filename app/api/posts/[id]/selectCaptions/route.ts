import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';
import type { PlatformId } from '@/lib/database.types';
import { PLATFORM_IDS } from '@/lib/platform/registry';

export const runtime = 'nodejs';

const SelectCaptionsSchema = z.object({
  selections: z.record(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const parsed = SelectCaptionsSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input' }, { status: 400 });
    }

    // Verify post belongs to user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
    }

    const { selections } = parsed.data;

    // Update each platform_post with selected caption
    for (const [platform, caption] of Object.entries(selections)) {
      if (PLATFORM_IDS.includes(platform as PlatformId)) {
        await supabase
          .from('platform_posts')
          .update({
            caption_selected: caption,
            caption_final: caption,
          })
          .eq('post_id', params.id)
          .eq('platform', platform);
      }
    }

    return jsonWithCookies(response, { success: true });
  } catch (err) {
    console.error('Select captions API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
