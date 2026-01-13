import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import { encryptToken } from '@/lib/encryption';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

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
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    console.error('OAuth error from provider:', errorParam, searchParams.get('error_description'));
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=${errorParam}`);
  }

  if (!code || !state) {
    console.error('Missing OAuth parameters - code:', !!code, 'state:', !!state);
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Missing+parameters`);
  }

  const { supabase } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('User not authenticated in callback:', userError);
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/login`);
  }

  // Use service role client to bypass RLS on oauth_states and connected_accounts
  const adminClient = createServiceRoleClient();

  // Verify state (using service role to bypass RLS)
  const { data: oauthState, error: stateError } = await adminClient
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('user_id', user.id)
    .single();

  if (stateError || !oauthState) {
    console.error('Invalid OAuth state - error:', stateError, 'state param:', state, 'user_id:', user.id);
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Invalid+state`);
  }

  // Delete used state
  await adminClient.from('oauth_states').delete().eq('id', oauthState.id);

  // Check if state expired
  if (new Date(oauthState.expires_at) < new Date()) {
    console.error('OAuth state expired');
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=State+expired`);
  }

  if (platform === 'instagram' || platform === 'facebook') {
    if (!META_APP_ID || !META_APP_SECRET) {
      console.error('Meta app not configured');
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Meta+not+configured`);
    }

    const redirectUri = `${NEXT_PUBLIC_APP_URL}/api/connect/${platform}/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('code', code);

    try {
      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error('Token exchange failed:', tokenData.error);
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Token+exchange+failed`);
      }

      const { access_token, expires_in } = tokenData;
      const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

      // Get user's Facebook pages and Instagram accounts
      const accountsRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${access_token}`
      );
      const accountsData = await accountsRes.json();

      if (accountsData.error) {
        console.error('Failed to fetch accounts:', accountsData.error);
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Failed+to+fetch+accounts`);
      }

      const pages = accountsData.data || [];

      if (pages.length === 0) {
        console.error('No pages/accounts found for user');
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=No+pages+found.+Make+sure+you+have+a+Facebook+page+linked+to+your+account.`);
      }

      // Track if we found any Instagram accounts (for setting is_primary)
      let firstInstagram = true;
      let firstFacebook = true;
      let anyAccountSaved = false;
      const errors: string[] = [];

      console.log(`[OAuth] Processing ${pages.length} page(s) for user ${user.id}`);

      for (const page of pages) {
        console.log(`[OAuth] Processing page: ${page.name} (${page.id})`);
        
        // Encrypt the token before storing - NEVER store plaintext tokens
        let encryptedToken: string;
        try {
          encryptedToken = await encryptToken(page.access_token);
        } catch (encErr) {
          console.error('CRITICAL: Failed to encrypt token - TOKEN_ENCRYPTION_KEY may not be configured');
          return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Encryption+configuration+error`);
        }

        // Always store Facebook page (using service role to bypass RLS)
        const { error: fbUpsertError } = await adminClient.from('connected_accounts').upsert({
          user_id: user.id,
          platform: 'facebook',
          external_account_id: page.id,
          token_encrypted: encryptedToken,
          token_expires_at: expiresAt,
          scopes: ['pages_manage_posts'],
          metadata: { name: page.name },
          is_primary: firstFacebook,
        }, { onConflict: 'user_id,platform,external_account_id' });
        
        if (fbUpsertError) {
          console.error('Failed to upsert Facebook account:', fbUpsertError);
          errors.push(`Facebook: ${fbUpsertError.message}`);
        } else {
          console.log(`[OAuth] Saved Facebook page: ${page.name}`);
          firstFacebook = false;
          anyAccountSaved = true;
        }

        // Always store Instagram business account if exists
        if (page.instagram_business_account) {
          const igId = page.instagram_business_account.id;
          console.log(`[OAuth] Found Instagram business account: ${igId}`);

          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igId}?fields=username&access_token=${page.access_token}`
          );
          const igData = await igRes.json();

          const { error: igUpsertError } = await adminClient.from('connected_accounts').upsert({
            user_id: user.id,
            platform: 'instagram',
            external_account_id: igId,
            token_encrypted: encryptedToken,
            token_expires_at: expiresAt,
            scopes: ['instagram_content_publish'],
            metadata: {
              name: igData.username || igId,
              page_id: page.id,
            },
            is_primary: firstInstagram,
          }, { onConflict: 'user_id,platform,external_account_id' });
          
          if (igUpsertError) {
            console.error('Failed to upsert Instagram account:', igUpsertError);
            errors.push(`Instagram: ${igUpsertError.message}`);
          } else {
            console.log(`[OAuth] Saved Instagram account: ${igData.username || igId}`);
            firstInstagram = false;
            anyAccountSaved = true;
          }
        }
      }

      if (!anyAccountSaved) {
        const errorMsg = errors.length > 0 ? errors.join('; ') : 'Unknown error saving accounts';
        console.error('[OAuth] No accounts were saved:', errorMsg);
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=${encodeURIComponent('Failed to save accounts: ' + errorMsg)}`);
      }

      console.log(`[OAuth] Successfully connected accounts for user ${user.id}`);
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?success=1`);
    } catch (err) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Callback+failed`);
    }
  }

  // TikTok OAuth callback
  if (platform === 'tiktok') {
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      console.error('TikTok app not configured');
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=TikTok+not+configured`);
    }

    const redirectUri = `${NEXT_PUBLIC_APP_URL}/api/connect/tiktok/callback`;

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        console.error('TikTok token exchange failed:', tokenData);
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=TikTok+token+exchange+failed`);
      }

      const { access_token, refresh_token, expires_in, open_id } = tokenData;
      const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();

      // Fetch user info from TikTok
      const userInfoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      const userInfoData = await userInfoRes.json();
      const tiktokUser = userInfoData.data?.user || {};
      const displayName = tiktokUser.display_name || tiktokUser.username || open_id;

      // Encrypt tokens before storing - NEVER store plaintext tokens
      let encryptedAccessToken: string;
      let encryptedRefreshToken: string | null = null;
      try {
        encryptedAccessToken = await encryptToken(access_token);
        if (refresh_token) {
          encryptedRefreshToken = await encryptToken(refresh_token);
        }
      } catch (encErr) {
        console.error('CRITICAL: Failed to encrypt TikTok token - TOKEN_ENCRYPTION_KEY may not be configured');
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Encryption+configuration+error`);
      }

      // Store TikTok account
      const { error: upsertError } = await adminClient.from('connected_accounts').upsert({
        user_id: user.id,
        platform: 'tiktok',
        external_account_id: open_id,
        token_encrypted: encryptedAccessToken,
        token_expires_at: expiresAt,
        scopes: ['user.info.basic', 'video.upload', 'video.publish'],
        metadata: {
          name: displayName,
          username: tiktokUser.username || null,
          avatar_url: tiktokUser.avatar_url || null,
          refresh_token: encryptedRefreshToken,
          refresh_token_expires_at: refresh_token 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
            : null,
        },
        is_primary: true,
      }, { onConflict: 'user_id,platform,external_account_id' });

      if (upsertError) {
        console.error('Failed to upsert TikTok account:', upsertError);
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Failed+to+save+TikTok+account`);
      }

      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?success=1`);
    } catch (err) {
      console.error('TikTok OAuth callback error:', err);
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=TikTok+callback+failed`);
    }
  }

  return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Platform+not+implemented`);
}
