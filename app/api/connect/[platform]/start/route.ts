import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import type { PlatformId } from '@/lib/database.types';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const META_APP_ID = process.env.META_APP_ID;
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;

// Security: Require NEXT_PUBLIC_APP_URL in production
function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production' && !url) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }
  return url || 'http://localhost:3000';
}
const NEXT_PUBLIC_APP_URL = getAppUrl();

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
      // Note: instagram_manage_insights and read_insights require App Review
      // They are commented out for development mode - add them back after approval
      const scopes = [
        // Basic access (available in development mode)
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'business_management',
        // Uncomment after Meta App Review approval:
        // 'instagram_manage_insights',
        // 'read_insights',
      ].join(',');

      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
      break;

    case 'tiktok':
      if (!TIKTOK_CLIENT_KEY) {
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=TikTok+app+not+configured`);
      }
      // TikTok OAuth 2.0 scopes
      const tiktokScopes = [
        'user.info.basic',
        'user.info.stats',      // Follower count, likes
        'video.upload',
        'video.publish',
        'video.list',           // Video analytics (views, likes, comments, shares)
      ].join(',');

      // TikTok uses a different OAuth URL structure
      const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
      tiktokAuthUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
      tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
      tiktokAuthUrl.searchParams.set('state', state);
      tiktokAuthUrl.searchParams.set('scope', tiktokScopes);
      tiktokAuthUrl.searchParams.set('response_type', 'code');

      authUrl = tiktokAuthUrl.toString();
      break;

    case 'linkedin':
    case 'youtube':
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Platform+not+yet+implemented`);

    default:
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Unknown+platform`);
  }

  return NextResponse.redirect(authUrl);
}
