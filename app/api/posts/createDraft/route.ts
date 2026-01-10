import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';

export const runtime = 'nodejs';

const CreateDraftSchema = z.object({
  assetId: z.string().uuid(),
  context: z.object({
    topic: z.string().min(1),
    targetAudience: z.string().optional().default(''),
    cta: z.string().optional().default(''),
    tone: z.string().optional().default('Professional'),
    location: z.string().optional().default(''),
    brandVoice: z.string().optional().default(''),
  }),
  timezone: z.string().optional().default('America/New_York'),
});

export async function POST(request: NextRequest) {
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
    const parsed = CreateDraftSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { assetId, context, timezone } = parsed.data;

    // Verify asset belongs to user
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();

    if (assetError || !asset) {
      return jsonWithCookies(response, { error: 'Asset not found' }, { status: 404 });
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        asset_id: assetId,
        context,
        status: 'draft',
        timezone,
      })
      .select()
      .single();

    if (postError) {
      console.error('Failed to create post:', postError);
      return jsonWithCookies(response, { error: 'Failed to create post' }, { status: 500 });
    }

    return jsonWithCookies(response, { post });
  } catch (err) {
    console.error('Create draft API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
