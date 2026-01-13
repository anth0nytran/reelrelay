import { type NextRequest } from 'next/server';
import { createRouteClient, createServiceRoleClient, jsonWithCookies } from '@/lib/supabase/route';
import { publishToInstagram } from '@/lib/publishers/instagram';
import { publishToFacebook } from '@/lib/publishers/facebook';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

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

// Background publishing function - processes platforms in sequence
async function publishInBackground(
  postId: string,
  platformPosts: PlatformPost[],
  connectedAccounts: ConnectedAccount[],
  assetUrl: string,
  adminClient: ReturnType<typeof createServiceRoleClient>
) {
  const results: Record<string, { success: boolean; error?: string }> = {};
  let allSucceeded = true;
  let anySucceeded = false;

  for (const platformPost of platformPosts) {
    const platform = platformPost.platform;
    
    const account = connectedAccounts.find(
      (a) => a.platform === platform && a.is_primary
    ) || connectedAccounts.find(
      (a) => a.platform === platform
    );

    if (!account) {
      results[platform] = { success: false, error: 'No connected account found' };
      allSucceeded = false;
      
      await adminClient
        .from('platform_posts')
        .update({
          status: 'failed',
          last_error: 'No connected account found',
          updated_at: new Date().toISOString(),
        })
        .eq('id', platformPost.id);
      
      continue;
    }

    // Update to publishing
    await adminClient
      .from('platform_posts')
      .update({
        status: 'publishing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', platformPost.id);

    console.log(`[PublishNow] Publishing to ${platform}...`);

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
        results[platform] = { success: true };

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

        console.log(`[PublishNow] ${platform} published successfully`);
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

        console.error(`[PublishNow] ${platform} failed:`, publishResult.error);
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

      console.error(`[PublishNow] ${platform} error:`, err);
    }
  }

  // Update overall post status
  let finalStatus: string;
  if (allSucceeded) {
    finalStatus = 'published';
  } else if (anySucceeded) {
    finalStatus = 'partially_published';
  } else {
    finalStatus = 'failed';
  }

  const { error: statusError } = await adminClient
    .from('posts')
    .update({
      status: finalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (statusError) {
    console.error(`[PublishNow] Failed to update post status:`, statusError);
  } else {
    console.log(`[PublishNow] Completed with status: ${finalStatus}`);
  }
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

  // Get full post data with asset
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
    console.error('Post fetch error:', postError);
    return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
  }

  if (!['draft', 'scheduled', 'failed', 'partially_published'].includes(post.status)) {
    return jsonWithCookies(response, { error: 'Cannot publish post in current status' }, { status: 400 });
  }

  const assetUrl = (post.assets as { public_url: string })?.public_url;
  if (!assetUrl) {
    return jsonWithCookies(response, { error: 'No video asset found for post' }, { status: 400 });
  }

  // Get platform posts
  const { data: platformPosts, error: ppError } = await supabase
    .from('platform_posts')
    .select('id, platform, caption_final, status')
    .eq('post_id', params.id);

  if (ppError || !platformPosts || platformPosts.length === 0) {
    console.error('Platform posts fetch error:', ppError);
    return jsonWithCookies(response, { error: 'No platforms selected for this post' }, { status: 400 });
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

  // IMMEDIATELY update post status to publishing
  await supabase
    .from('posts')
    .update({
      status: 'publishing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  // Update platform_posts to queued status immediately
  await adminClient
    .from('platform_posts')
    .update({
      status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('post_id', params.id)
    .in('status', ['draft', 'scheduled', 'failed']);

  // Check if we should process synchronously or use background
  // For Vercel, we can use waitUntil if available, otherwise we process synchronously
  // For local dev, we process synchronously
  
  // Start background publishing (won't block the response on Vercel with streaming)
  const publishPromise = publishInBackground(
    params.id,
    platformPosts as PlatformPost[],
    connectedAccounts as ConnectedAccount[],
    assetUrl,
    adminClient
  );

  // For Edge runtime with Vercel, we could use waitUntil
  // For now, we'll process synchronously but the UI shows progress
  await publishPromise;

  // Fetch final status
  const { data: updatedPost } = await supabase
    .from('posts')
    .select('status')
    .eq('id', params.id)
    .single();

  return jsonWithCookies(response, {
    success: updatedPost?.status === 'published' || updatedPost?.status === 'partially_published',
    status: updatedPost?.status || 'publishing',
    message: 'Publishing complete',
  });
}
