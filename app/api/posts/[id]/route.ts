import { NextResponse, type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
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

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      assets:assets(*),
      caption_sets:caption_sets(*),
      platform_posts:platform_posts(*)
    `
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !post) {
    return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
  }

  // Auto-fix: If post is stuck in 'publishing' or 'queued' but all platform_posts are done,
  // update the parent status based on platform_posts
  if (['publishing', 'queued'].includes(post.status) && post.platform_posts?.length > 0) {
    const platformStatuses = post.platform_posts.map((pp: any) => pp.status);
    const allDone = platformStatuses.every((s: string) => ['published', 'failed', 'canceled'].includes(s));
    
    if (allDone) {
      const allPublished = platformStatuses.every((s: string) => s === 'published');
      const anyPublished = platformStatuses.some((s: string) => s === 'published');
      const allCanceled = platformStatuses.every((s: string) => s === 'canceled');
      
      let correctStatus: string;
      if (allCanceled) {
        correctStatus = 'canceled';
      } else if (allPublished) {
        correctStatus = 'published';
      } else if (anyPublished) {
        correctStatus = 'partially_published';
      } else {
        correctStatus = 'failed';
      }
      
      // Update the status (using service role to ensure it works)
      const adminClient = createServiceRoleClient();
      await adminClient
        .from('posts')
        .update({ status: correctStatus, updated_at: new Date().toISOString() })
        .eq('id', post.id);
      
      console.log(`[AutoFix] Updated post ${post.id} status from ${post.status} to ${correctStatus}`);
      post.status = correctStatus;
    }
  }

  return jsonWithCookies(response, { post });
}
