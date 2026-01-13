import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlatformStats {
  platform: string;
  accountName: string;
  followers?: number;
  mediaCount?: number;
  profilePicture?: string;
}

interface OverviewResponse {
  platforms: PlatformStats[];
  totals: {
    followers: number;
    connectedAccounts: number;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  const { supabase } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createServiceRoleClient();

  // Get all connected accounts
  const { data: accounts, error: accountsError } = await adminClient
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id);

  if (accountsError) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }

  const platformStats: PlatformStats[] = [];
  let totalFollowers = 0;

  // Fetch stats for each connected account
  for (const account of accounts || []) {
    try {
      // Decrypt token
      let accessToken = account.token_encrypted;
      try {
        accessToken = await decryptToken(account.token_encrypted);
      } catch {
        // Token might not be encrypted in dev
      }

      if (account.platform === 'instagram') {
        // Fetch Instagram account info with follower count
        // Using instagram_basic scope - gets followers_count, media_count
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.external_account_id}?fields=username,followers_count,media_count,profile_picture_url&access_token=${accessToken}`
        );
        const igData = await igRes.json();

        if (!igData.error) {
          const followers = igData.followers_count || 0;
          platformStats.push({
            platform: 'instagram',
            accountName: igData.username || account.metadata?.name || 'Instagram',
            followers: followers,
            mediaCount: igData.media_count,
            profilePicture: igData.profile_picture_url,
          });
          totalFollowers += followers;
        }
      } else if (account.platform === 'facebook') {
        // Fetch Facebook Page info with fan count
        // Using pages_read_engagement scope - gets fan_count
        const fbRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.external_account_id}?fields=name,fan_count,picture&access_token=${accessToken}`
        );
        const fbData = await fbRes.json();

        if (!fbData.error) {
          const fans = fbData.fan_count || 0;
          platformStats.push({
            platform: 'facebook',
            accountName: fbData.name || account.metadata?.name || 'Facebook Page',
            followers: fans,
            profilePicture: fbData.picture?.data?.url,
          });
          totalFollowers += fans;
        }
      } else if (account.platform === 'tiktok') {
        // TikTok only has basic info with current scopes (no follower count)
        platformStats.push({
          platform: 'tiktok',
          accountName: account.metadata?.name || account.metadata?.username || 'TikTok',
          profilePicture: account.metadata?.avatar_url,
          // followers not available with user.info.basic scope
        });
      }
    } catch (err) {
      console.error(`Failed to fetch stats for ${account.platform}:`, err);
      // Still add the account with basic info
      platformStats.push({
        platform: account.platform,
        accountName: account.metadata?.name || account.platform,
      });
    }
  }

  const response: OverviewResponse = {
    platforms: platformStats,
    totals: {
      followers: totalFollowers,
      connectedAccounts: accounts?.length || 0,
    },
  };

  return NextResponse.json(response);
}
