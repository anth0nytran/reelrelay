import { type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleDelete(request: NextRequest, postId: string) {
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
    .eq('id', postId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Delete] Database error:', fetchError);
    return jsonWithCookies(response, { error: 'Database error' }, { status: 500 });
  }

  // If post doesn't exist, consider it already deleted
  if (!post) {
    return jsonWithCookies(response, { success: true, deleted: true });
  }

  // Verify ownership
  if (post.user_id !== user.id) {
    return jsonWithCookies(response, { error: 'Not authorized' }, { status: 403 });
  }

  // Don't allow deleting posts that are currently being published
  if (post.status === 'publishing') {
    return jsonWithCookies(response, { 
      error: 'Cannot delete while publishing. Cancel first, then delete.' 
    }, { status: 400 });
  }

  // Delete platform_posts first (due to foreign key)
  const { error: ppDeleteError } = await adminClient
    .from('platform_posts')
    .delete()
    .eq('post_id', postId);

  if (ppDeleteError) {
    console.error('[Delete] Failed to delete platform_posts:', ppDeleteError);
  }

  // Delete caption_sets
  const { error: csDeleteError } = await adminClient
    .from('caption_sets')
    .delete()
    .eq('post_id', postId);

  if (csDeleteError) {
    console.error('[Delete] Failed to delete caption_sets:', csDeleteError);
  }

  // Delete the post
  const { error: deleteError } = await adminClient
    .from('posts')
    .delete()
    .eq('id', postId);

  if (deleteError) {
    console.error('[Delete] Failed to delete post:', deleteError);
    return jsonWithCookies(response, { error: 'Failed to delete post' }, { status: 500 });
  }

  return jsonWithCookies(response, { success: true, deleted: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleDelete(request, params.id);
}

// Also support POST for browsers that have issues with DELETE
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleDelete(request, params.id);
}
