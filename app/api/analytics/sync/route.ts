import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, createServiceRoleClient } from '@/lib/supabase/route';
import { decryptToken } from '@/lib/encryption';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyticsSnapshot {
  views?: number;
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  plays?: number;
  engagement_rate?: number;
  platform_data?: Record<string, unknown>;
}

/**
 * POST /api/analytics/sync
 * Syncs analytics for all published posts (or specific post IDs)
 * 
 * Body: { postIds?: string[] } - Optional array of platform_post IDs to sync
 */
export async function POST(request: NextRequest) {
  const { supabase } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const postIds = body.postIds as string[] | undefined;

  const adminClient = createServiceRoleClient();

  // Get published platform posts that need analytics sync
  let query = adminClient
    .from('platform_posts')
    .select(`
      id,
      platform,
      external_post_id,
      post_id,
      last_analytics_sync,
      posts!inner(user_id, asset_id)
    `)
    .eq('posts.user_id', user.id)
    .eq('status', 'published')
    .not('external_post_id', 'is', null);

  if (postIds && postIds.length > 0) {
    query = query.in('id', postIds);
  }

  const { data: platformPosts, error: postsError } = await query;

  if (postsError) {
    console.error('Failed to fetch platform posts:', postsError);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }

  if (!platformPosts || platformPosts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No published posts to sync' });
  }

  // Get connected accounts for token access
  const { data: accounts } = await adminClient
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id);

  const accountsByPlatform = new Map<PlatformId, typeof accounts>();
  for (const account of accounts || []) {
    if (!accountsByPlatform.has(account.platform)) {
      accountsByPlatform.set(account.platform, []);
    }
    accountsByPlatform.get(account.platform)!.push(account);
  }

  const results: { postId: string; platform: string; success: boolean; error?: string }[] = [];

  // Sync analytics for each platform post
  for (const platformPost of platformPosts) {
    const platform = platformPost.platform as PlatformId;
    const platformAccounts = accountsByPlatform.get(platform);

    if (!platformAccounts || platformAccounts.length === 0) {
      results.push({
        postId: platformPost.id,
        platform,
        success: false,
        error: 'No connected account',
      });
      continue;
    }

    // Get the primary account or first one
    const account = platformAccounts.find(a => a.is_primary) || platformAccounts[0];

    try {
      // Decrypt token
      let accessToken = account.token_encrypted;
      try {
        accessToken = await decryptToken(account.token_encrypted);
      } catch {
        // Token might not be encrypted in dev
      }

      let analytics: AnalyticsSnapshot | null = null;

      // Fetch analytics based on platform
      if (platform === 'instagram') {
        analytics = await fetchInstagramInsights(
          platformPost.external_post_id!,
          accessToken
        );
      } else if (platform === 'facebook') {
        analytics = await fetchFacebookInsights(
          platformPost.external_post_id!,
          accessToken
        );
      } else if (platform === 'tiktok') {
        analytics = await fetchTikTokInsights(
          platformPost.external_post_id!,
          accessToken
        );
      }

      if (analytics) {
        // Insert analytics snapshot
        const { error: insertError } = await adminClient
          .from('post_analytics')
          .insert({
            platform_post_id: platformPost.id,
            ...analytics,
            fetched_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to insert analytics:', insertError);
          results.push({
            postId: platformPost.id,
            platform,
            success: false,
            error: 'Failed to save analytics',
          });
        } else {
          results.push({
            postId: platformPost.id,
            platform,
            success: true,
          });
        }
      } else {
        results.push({
          postId: platformPost.id,
          platform,
          success: false,
          error: 'No analytics data returned',
        });
      }
    } catch (err) {
      console.error(`Failed to sync analytics for ${platform}:`, err);
      results.push({
        postId: platformPost.id,
        platform,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const syncedCount = results.filter(r => r.success).length;

  return NextResponse.json({
    synced: syncedCount,
    total: platformPosts.length,
    results,
  });
}

/**
 * Fetch Instagram post insights
 * Requires: instagram_manage_insights scope
 */
async function fetchInstagramInsights(
  mediaId: string,
  accessToken: string
): Promise<AnalyticsSnapshot | null> {
  try {
    // For Instagram media insights
    // Available metrics depend on media type (IMAGE, VIDEO, CAROUSEL_ALBUM, REELS)
    const metrics = [
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'saved',
      'plays',        // For reels/video
      'total_interactions',
    ].join(',');

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('Instagram insights error:', data.error);
      
      // Fallback: try to get basic engagement from media endpoint
      const mediaRes = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`
      );
      const mediaData = await mediaRes.json();
      
      if (!mediaData.error) {
        return {
          likes: mediaData.like_count,
          comments: mediaData.comments_count,
        };
      }
      return null;
    }

    const insights: AnalyticsSnapshot = {};
    for (const metric of data.data || []) {
      const value = metric.values?.[0]?.value ?? metric.value;
      switch (metric.name) {
        case 'impressions':
          insights.impressions = value;
          break;
        case 'reach':
          insights.reach = value;
          break;
        case 'likes':
          insights.likes = value;
          break;
        case 'comments':
          insights.comments = value;
          break;
        case 'shares':
          insights.shares = value;
          break;
        case 'saved':
          insights.saves = value;
          break;
        case 'plays':
          insights.plays = value;
          insights.views = value;
          break;
        case 'total_interactions':
          // Store in platform_data for reference
          insights.platform_data = {
            ...insights.platform_data,
            total_interactions: value,
          };
          break;
      }
    }

    // Calculate engagement rate
    if (insights.reach && insights.reach > 0) {
      const engagement = (insights.likes || 0) + (insights.comments || 0) + (insights.shares || 0) + (insights.saves || 0);
      insights.engagement_rate = (engagement / insights.reach) * 100;
    }

    return insights;
  } catch (err) {
    console.error('fetchInstagramInsights error:', err);
    return null;
  }
}

/**
 * Fetch Facebook post insights
 * Requires: read_insights scope
 */
async function fetchFacebookInsights(
  postId: string,
  accessToken: string
): Promise<AnalyticsSnapshot | null> {
  try {
    // Facebook post insights metrics
    const metrics = [
      'post_impressions',
      'post_impressions_unique',  // reach
      'post_engaged_users',
      'post_reactions_by_type_total',
      'post_clicks',
      'post_video_views',
    ].join(',');

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('Facebook insights error:', data.error);
      
      // Fallback: try basic engagement
      const postRes = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
      );
      const postData = await postRes.json();
      
      if (!postData.error) {
        return {
          likes: postData.likes?.summary?.total_count,
          comments: postData.comments?.summary?.total_count,
          shares: postData.shares?.count,
        };
      }
      return null;
    }

    const insights: AnalyticsSnapshot = {};
    for (const metric of data.data || []) {
      const value = metric.values?.[0]?.value ?? metric.value;
      switch (metric.name) {
        case 'post_impressions':
          insights.impressions = value;
          break;
        case 'post_impressions_unique':
          insights.reach = value;
          break;
        case 'post_engaged_users':
          insights.platform_data = {
            ...insights.platform_data,
            engaged_users: value,
          };
          break;
        case 'post_reactions_by_type_total':
          // Sum all reaction types
          if (typeof value === 'object') {
            insights.likes = Object.values(value as Record<string, number>).reduce((a, b) => a + b, 0);
          }
          break;
        case 'post_video_views':
          insights.views = value;
          insights.plays = value;
          break;
      }
    }

    // Calculate engagement rate
    if (insights.reach && insights.reach > 0) {
      const engagement = (insights.likes || 0) + (insights.comments || 0) + (insights.shares || 0);
      insights.engagement_rate = (engagement / insights.reach) * 100;
    }

    return insights;
  } catch (err) {
    console.error('fetchFacebookInsights error:', err);
    return null;
  }
}

/**
 * Fetch TikTok video insights
 * Requires: video.list scope
 */
async function fetchTikTokInsights(
  videoId: string,
  accessToken: string
): Promise<AnalyticsSnapshot | null> {
  try {
    // TikTok video query endpoint
    const res = await fetch('https://open.tiktokapis.com/v2/video/query/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          video_ids: [videoId],
        },
        fields: [
          'id',
          'title',
          'view_count',
          'like_count',
          'comment_count',
          'share_count',
        ],
      }),
    });

    const data = await res.json();

    if (data.error || !data.data?.videos?.[0]) {
      console.error('TikTok video query error:', data.error);
      return null;
    }

    const video = data.data.videos[0];

    return {
      views: video.view_count,
      likes: video.like_count,
      comments: video.comment_count,
      shares: video.share_count,
      engagement_rate: video.view_count > 0
        ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
        : 0,
    };
  } catch (err) {
    console.error('fetchTikTokInsights error:', err);
    return null;
  }
}
