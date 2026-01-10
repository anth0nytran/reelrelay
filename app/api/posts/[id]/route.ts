import { NextResponse, type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';

export const runtime = 'nodejs';

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

  return jsonWithCookies(response, { post });
}
