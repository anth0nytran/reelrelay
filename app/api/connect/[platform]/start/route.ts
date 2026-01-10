import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import type { PlatformId } from '@/lib/database.types';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const META_APP_ID = process.env.META_APP_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform as PlatformId;
  const { supabase } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `/api/connect/${platform}/start`);
    return NextResponse.redirect(loginUrl);
  }

  // Use service role client to bypass RLS on oauth_states table
  const adminClient = createServiceRoleClient();

  // Generate state for CSRF protection
  const state = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  // Store state in DB (using service role to bypass RLS)
  const { error: insertError } = await adminClient.from('oauth_states').insert({
    user_id: user.id,
    platform,
    state,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Failed to store OAuth state:', insertError);
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Failed+to+start+OAuth`);
  }

  let authUrl: string;
  const redirectUri = `${NEXT_PUBLIC_APP_URL}/api/connect/${platform}/callback`;

  switch (platform) {
    case 'instagram':
    case 'facebook':
      if (!META_APP_ID) {
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Meta+app+not+configured`);
      }
      const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'business_management',
      ].join(',');

      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
      break;

    case 'linkedin':
    case 'tiktok':
    case 'youtube':
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Platform+not+yet+implemented`);

    default:
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Unknown+platform`);
  }

  return NextResponse.redirect(authUrl);
}
