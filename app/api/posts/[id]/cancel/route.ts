import { type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, response } = createRouteClient(request);
  const adminClient = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to fetch post (bypasses RLS for reliable access)
  const { data: post, error: fetchError } = await adminClient
    .from('posts')
    .select('id, status, user_id')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError) {
    console.error('[Cancel] Database error:', fetchError);
    return jsonWithCookies(response, { error: 'Database error' }, { status: 500 });
  }

  if (!post) {
    return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
  }

  // Verify ownership
  if (post.user_id !== user.id) {
    return jsonWithCookies(response, { error: 'Not authorized' }, { status: 403 });
  }

  // Allow canceling draft, scheduled, queued, and publishing posts
  // Only published, failed, partially_published, and canceled posts cannot be canceled
  if (['published', 'failed', 'partially_published', 'canceled'].includes(post.status)) {
    return jsonWithCookies(response, { error: 'Cannot cancel post in current status' }, { status: 400 });
  }

  // Update post status
  const { error: updateError } = await adminClient
    .from('posts')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (updateError) {
    console.error('[Cancel] Failed to cancel post:', updateError);
    return jsonWithCookies(response, { error: 'Failed to cancel post' }, { status: 500 });
  }

  // Update platform_posts
  const { error: ppError } = await adminClient
    .from('platform_posts')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('post_id', params.id);

  if (ppError) {
    console.error('[Cancel] Failed to cancel platform_posts:', ppError);
  }

  return jsonWithCookies(response, { success: true });
}
