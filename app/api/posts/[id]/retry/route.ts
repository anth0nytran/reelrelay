import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';

const RetrySchema = z.object({
  platforms: z.array(z.string()).optional(),
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
    const body = await request.json().catch(() => ({}));
    const parsed = RetrySchema.safeParse(body);
    const platforms = parsed.success ? parsed.data.platforms : undefined;

    // Verify post belongs to user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
    }

    // Build the update query
    let query = supabase
      .from('platform_posts')
      .update({
        status: 'queued',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('post_id', params.id)
      .eq('status', 'failed');

    if (platforms && platforms.length > 0) {
      query = query.in('platform', platforms as PlatformId[]);
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error('Failed to retry platform posts:', updateError);
      return jsonWithCookies(response, { error: 'Failed to retry' }, { status: 500 });
    }

    // Update post status if it was failed
    if (post.status === 'failed') {
      await supabase
        .from('posts')
        .update({
          status: 'queued',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
    }

    return jsonWithCookies(response, { success: true });
  } catch (err) {
    console.error('Retry API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
