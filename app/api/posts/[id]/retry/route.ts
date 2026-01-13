import { type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';
import { publishToInstagram } from '@/lib/publishers/instagram';
import { publishToFacebook } from '@/lib/publishers/facebook';
import { z } from 'zod';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

const RetrySchema = z.object({
  platforms: z.array(z.string()).optional(),
});

interface PlatformPost {
  id: string;
  platform: PlatformId;
  caption_final: string;
  status: string;
}

interface ConnectedAccount {
  id: string;
  platform: PlatformId;
  external_account_id: string;
  token_encrypted: string;
  metadata: Record<string, unknown>;
  is_primary: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, response } = createRouteClient(request);
  const adminClient = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = RetrySchema.safeParse(body);
    const platformsToRetry = parsed.success ? parsed.data.platforms : undefined;

    // Get post with asset
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id, 
        status,
        user_id,
        asset_id,
        assets!inner(id, public_url, r2_key)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
    }

    const assetUrl = (post.assets as { public_url: string })?.public_url;
    if (!assetUrl) {
      return jsonWithCookies(response, { error: 'No video asset found for post' }, { status: 400 });
    }

    // Get failed platform posts
    let query = supabase
      .from('platform_posts')
      .select('id, platform, caption_final, status')
      .eq('post_id', params.id)
      .eq('status', 'failed');

    if (platformsToRetry && platformsToRetry.length > 0) {
      query = query.in('platform', platformsToRetry as PlatformId[]);
    }

    const { data: failedPosts, error: fpError } = await query;

    if (fpError) {
      console.error('Failed to fetch platform posts:', fpError);
      return jsonWithCookies(response, { error: 'Failed to fetch failed posts' }, { status: 500 });
    }

    if (!failedPosts || failedPosts.length === 0) {
      return jsonWithCookies(response, { error: 'No failed platforms to retry' }, { status: 400 });
    }

    // Get connected accounts
    const { data: connectedAccounts, error: caError } = await adminClient
      .from('connected_accounts')
      .select('id, platform, external_account_id, token_encrypted, metadata, is_primary')
      .eq('user_id', user.id);

    if (caError) {
      console.error('Connected accounts fetch error:', caError);
      return jsonWithCookies(response, { error: 'Failed to fetch connected accounts' }, { status: 500 });
    }

    // Update post status to publishing
    await supabase
      .from('posts')
      .update({
        status: 'publishing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    // Retry each failed platform
    const results: Record<string, { success: boolean; error?: string; externalId?: string; url?: string }> = {};
    let allSucceeded = true;
    let anySucceeded = false;

    for (const platformPost of failedPosts as PlatformPost[]) {
      const platform = platformPost.platform;

      // Find connected account
      const account = (connectedAccounts as ConnectedAccount[])?.find(
        (a) => a.platform === platform && a.is_primary
      ) || (connectedAccounts as ConnectedAccount[])?.find(
        (a) => a.platform === platform
      );

      if (!account) {
        results[platform] = { success: false, error: 'No connected account found' };
        allSucceeded = false;
        continue;
      }

      // Update to publishing
      await adminClient
        .from('platform_posts')
        .update({
          status: 'publishing',
          started_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', platformPost.id);

      console.log(`[Retry] Retrying ${platform}...`);

      try {
        let publishResult: { success: boolean; error?: string; mediaId?: string; postId?: string; permalinkUrl?: string };

        if (platform === 'instagram') {
          publishResult = await publishToInstagram({
            accessToken: account.token_encrypted,
            instagramAccountId: account.external_account_id,
            videoUrl: assetUrl,
            caption: platformPost.caption_final || '',
          });
        } else if (platform === 'facebook') {
          publishResult = await publishToFacebook({
            accessToken: account.token_encrypted,
            pageId: account.external_account_id,
            videoUrl: assetUrl,
            caption: platformPost.caption_final || '',
          });
        } else {
          publishResult = { success: false, error: `${platform} publishing not yet implemented` };
        }

        if (publishResult.success) {
          anySucceeded = true;
          results[platform] = {
            success: true,
            externalId: publishResult.mediaId || publishResult.postId,
            url: publishResult.permalinkUrl,
          };

          await adminClient
            .from('platform_posts')
            .update({
              status: 'published',
              external_post_id: publishResult.mediaId || publishResult.postId,
              external_url: publishResult.permalinkUrl,
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_error: null,
            })
            .eq('id', platformPost.id);

          console.log(`[Retry] ${platform} published successfully:`, publishResult);
        } else {
          allSucceeded = false;
          results[platform] = { success: false, error: publishResult.error };

          await adminClient
            .from('platform_posts')
            .update({
              status: 'failed',
              last_error: publishResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', platformPost.id);

          console.error(`[Retry] ${platform} failed again:`, publishResult.error);
        }
      } catch (err) {
        allSucceeded = false;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results[platform] = { success: false, error: errorMessage };

        await adminClient
          .from('platform_posts')
          .update({
            status: 'failed',
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', platformPost.id);

        console.error(`[Retry] ${platform} error:`, err);
      }
    }

    // Check if all platform_posts are now published
    const { data: allPlatformPosts } = await supabase
      .from('platform_posts')
      .select('status')
      .eq('post_id', params.id);

    const allPublished = allPlatformPosts?.every((pp) => pp.status === 'published');
    const anyPublished = allPlatformPosts?.some((pp) => pp.status === 'published');
    const anyFailed = allPlatformPosts?.some((pp) => pp.status === 'failed');

    let finalStatus: string;
    if (allPublished) {
      finalStatus = 'published';
    } else if (anyPublished && anyFailed) {
      finalStatus = 'partially_published';
    } else if (anyFailed) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'published';
    }

    await supabase
      .from('posts')
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    return jsonWithCookies(response, {
      success: anySucceeded,
      status: finalStatus,
      results,
      message: allSucceeded
        ? 'Retry successful for all platforms'
        : anySucceeded
        ? 'Retry successful for some platforms'
        : 'Retry failed for all platforms',
    });
  } catch (err) {
    console.error('Retry API error:', err);
    return jsonWithCookies(response, { error: 'Internal server error' }, { status: 500 });
  }
}
