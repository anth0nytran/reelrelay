import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    return jsonWithCookies(response, { error: 'Cannot publish post in current status' }, { status: 400 });
  }

  // Update post status to queued
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      status: 'queued',
      scheduled_for: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (updateError) {
    console.error('Failed to queue post:', updateError);
    return jsonWithCookies(response, { error: 'Failed to queue post' }, { status: 500 });
  }

  // Update platform_posts to queued
  await supabase
    .from('platform_posts')
    .update({
      status: 'queued',
      scheduled_for: null,
      updated_at: new Date().toISOString(),
    })
    .eq('post_id', params.id);

  return jsonWithCookies(response, { success: true, message: 'Post queued for publishing' });
}
