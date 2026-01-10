import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { supabase, response } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  // Get all scheduled, queued, and publishing posts for user
  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      assets (
        id,
        public_url,
        mime
      ),
      platform_posts (
        id,
        platform,
        status,
        scheduled_for
      )
    `
    )
    .eq('user_id', user.id)
    .in('status', ['scheduled', 'queued', 'publishing'])
    .order('scheduled_for', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch queue:', error);
    return jsonWithCookies(response, { error: 'Failed to fetch queue' }, { status: 500 });
  }

  // Add platform summary for each post (format frontend expects)
  const queue = (posts || []).map((post) => ({
    ...post,
    platformSummary: (post.platform_posts || []).map((pp: { platform: string; status: string }) => ({
      platform: pp.platform,
      status: pp.status,
    })),
  }));

  return jsonWithCookies(response, { queue });
}
