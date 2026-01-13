import { NextResponse, type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';

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

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      assets!asset_id (
        id,
        public_url,
        mime,
        duration_seconds
      ),
      platform_posts (
        id,
        platform,
        status,
        caption_final,
        scheduled_for,
        published_at,
        last_error,
        external_post_id,
        external_url,
        latest_analytics,
        last_analytics_sync
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch posts:', error);
    return jsonWithCookies(
      response,
      { error: error.message },
      { status: 500 }
    );
  }

  return jsonWithCookies(response, { posts: posts ?? [] });
}
