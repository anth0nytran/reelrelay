import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { z } from 'zod';

export const runtime = 'nodejs';

const CompleteUploadSchema = z.object({
  r2Key: z.string().min(1),
  publicUrl: z.string().url(),
  mime: z.string().min(1),
  sizeBytes: z.number().positive(),
  durationSeconds: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
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
    const parsed = CompleteUploadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { r2Key, publicUrl, mime, sizeBytes, durationSeconds, width, height } = parsed.data;

    // Create asset record
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        user_id: user.id,
        r2_key: r2Key,
        public_url: publicUrl,
        mime,
        size_bytes: sizeBytes,
        duration_seconds: durationSeconds || null,
        width: width || null,
        height: height || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create asset:', error);
      return jsonWithCookies(response, { error: 'Failed to create asset' }, { status: 500 });
    }

    return jsonWithCookies(response, { asset });
  } catch (err) {
    console.error('Complete upload API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
