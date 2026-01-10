import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'atn-social-assets';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

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
    const parsed = PresignSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCookies(response, { error: 'Invalid input' }, { status: 400 });
    }

    const { filename, contentType } = parsed.data;

    // Generate unique key
    const ext = filename.split('.').pop() || 'mp4';
    const r2Key = `uploads/${user.id}/${randomUUID()}.${ext}`;

    // If R2 is not configured, return mock data for development
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.warn('R2 not configured, using mock presign response');
      return jsonWithCookies(response, {
        uploadUrl: `https://httpbin.org/put`,
        r2Key,
        publicUrl: `https://example.com/${r2Key}`,
      });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${r2Key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${r2Key}`;

    return jsonWithCookies(response, { uploadUrl, r2Key, publicUrl });
  } catch (err) {
    console.error('Presign API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
