import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';

export const runtime = 'nodejs';

const ScheduleSchema = z.object({
  scheduledFor: z.string(),
  timezone: z.string().optional(),
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
    const parsed = ScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { scheduledFor, timezone } = parsed.data;

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

    if (!['draft', 'scheduled'].includes(post.status)) {
      return jsonWithCookies(response, { error: 'Cannot schedule post in current status' }, { status: 400 });
    }

    // Update post with schedule
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledFor,
        timezone: timezone || 'America/New_York',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Failed to schedule post:', updateError);
      return jsonWithCookies(response, { error: 'Failed to schedule post' }, { status: 500 });
    }

    // Update platform_posts
    await supabase
      .from('platform_posts')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledFor,
        updated_at: new Date().toISOString(),
      })
      .eq('post_id', params.id);

    return jsonWithCookies(response, { success: true });
  } catch (err) {
    console.error('Schedule API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
