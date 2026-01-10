import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import { encryptToken } from '@/lib/encryption';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

      for (const page of pages) {
        // Encrypt the token before storing
        let encryptedToken: string;
        try {
          encryptedToken = await encryptToken(page.access_token);
        } catch (encErr) {
          console.error('Failed to encrypt token:', encErr);
          // Fall back to plaintext if encryption key not configured (dev mode)
          encryptedToken = page.access_token;
        }

        // Store Facebook page (using service role to bypass RLS)
        if (platform === 'facebook') {
          const { error: upsertError } = await adminClient.from('connected_accounts').upsert({
            user_id: user.id,
            platform: 'facebook',
            external_account_id: page.id,
            token_encrypted: encryptedToken,
            token_expires_at: expiresAt,
            scopes: ['pages_manage_posts'],
            metadata: { name: page.name },
            is_primary: pages.indexOf(page) === 0,
          }, { onConflict: 'user_id,platform,external_account_id' });
          
          if (upsertError) {
            console.error('Failed to upsert Facebook account:', upsertError);
          }
        }

        // Store Instagram business account if exists
        if (platform === 'instagram' && page.instagram_business_account) {
          const igId = page.instagram_business_account.id;

          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igId}?fields=username&access_token=${page.access_token}`
          );
          const igData = await igRes.json();

          const { error: upsertError } = await adminClient.from('connected_accounts').upsert({
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
            is_primary: true,
          }, { onConflict: 'user_id,platform,external_account_id' });
          
          if (upsertError) {
            console.error('Failed to upsert Instagram account:', upsertError);
          }
        }
      }

      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?success=1`);
    } catch (err) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Callback+failed`);
    }
  }

  return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/app/connections?error=Platform+not+implemented`);
}
