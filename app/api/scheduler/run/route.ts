import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/route';
import { publishToInstagram } from '@/lib/publishers/instagram';
import { publishToFacebook } from '@/lib/publishers/facebook';
import type { PlatformId } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

// Protection for this endpoint:
// - Vercel Cron: Uses CRON_SECRET header automatically
// - External cron: Uses SCHEDULER_SECRET in Authorization header
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET;
const CRON_SECRET = process.env.CRON_SECRET; // Vercel sets this automatically

interface ScheduledPost {
  id: string;
  post_id: string;
  platform: PlatformId;
  caption_final: string;
  scheduled_for: string;
  user_id: string;
  asset_url: string;
}

interface ConnectedAccount {
  id: string;
  platform: PlatformId;
  external_account_id: string;
  token_encrypted: string;
  is_primary: boolean;
}

/**
 * Scheduler endpoint - processes posts that are due for publishing
 * Should be called by a cron job every 1-5 minutes
 * 
 * For Vercel: Set up a cron job in vercel.json
 * For other hosts: Use external cron service (e.g., cron-job.org)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  // Vercel uses CRON_SECRET header, external crons use Authorization header
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  // In production, require authentication
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercelCron = vercelCronHeader === CRON_SECRET && CRON_SECRET;
  const isAuthorizedExternal = providedSecret === SCHEDULER_SECRET && SCHEDULER_SECRET;

  if (isProduction && !isVercelCron && !isAuthorizedExternal) {
    console.error('[Scheduler] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createServiceRoleClient();

  try {
    console.log('[Scheduler] Running scheduled post check...');

    // Find all platform_posts that are scheduled and due
    const { data: duePosts, error: dueError } = await adminClient
      .from('platform_posts')
      .select(`
        id,
        post_id,
        platform,
        caption_final,
        scheduled_for,
        posts!inner(
          id,
          user_id,
          status,
          assets!inner(public_url)
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10); // Process in batches

    if (dueError) {
      console.error('[Scheduler] Error fetching due posts:', dueError);
      return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      console.log('[Scheduler] No posts due for publishing');
      return NextResponse.json({ message: 'No posts due', processed: 0 });
    }

    console.log(`[Scheduler] Found ${duePosts.length} platform posts due for publishing`);

    const results: Array<{ platform: string; postId: string; success: boolean; error?: string }> = [];

    for (const platformPost of duePosts) {
      const post = platformPost.posts as unknown as { 
        id: string; 
        user_id: string; 
        status: string;
        assets: { public_url: string };
      };

      // Skip if parent post is not in a publishable state
      if (!['scheduled', 'queued', 'publishing', 'partially_published'].includes(post.status)) {
        console.log(`[Scheduler] Skipping ${platformPost.platform} - parent post status is ${post.status}`);
        continue;
      }

      const assetUrl = post.assets?.public_url;
      if (!assetUrl) {
        console.error(`[Scheduler] No asset URL for post ${post.id}`);
        await adminClient
          .from('platform_posts')
          .update({
            status: 'failed',
            last_error: 'No video asset found',
            updated_at: new Date().toISOString(),
          })
          .eq('id', platformPost.id);
        results.push({ platform: platformPost.platform, postId: post.id, success: false, error: 'No asset' });
        continue;
      }

      // Get connected account for this platform
      const { data: accounts, error: accError } = await adminClient
        .from('connected_accounts')
        .select('id, platform, external_account_id, token_encrypted, is_primary')
        .eq('user_id', post.user_id)
        .eq('platform', platformPost.platform);

      if (accError || !accounts || accounts.length === 0) {
        console.error(`[Scheduler] No connected account for ${platformPost.platform}`);
        await adminClient
          .from('platform_posts')
          .update({
            status: 'failed',
            last_error: 'No connected account found',
            updated_at: new Date().toISOString(),
          })
          .eq('id', platformPost.id);
        results.push({ platform: platformPost.platform, postId: post.id, success: false, error: 'No account' });
        continue;
      }

      const account = (accounts as ConnectedAccount[]).find(a => a.is_primary) || accounts[0] as ConnectedAccount;

      // Mark as publishing
      await adminClient
        .from('platform_posts')
        .update({
          status: 'publishing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', platformPost.id);

      // Also update parent post
      await adminClient
        .from('posts')
        .update({
          status: 'publishing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      console.log(`[Scheduler] Publishing to ${platformPost.platform}...`);

      try {
        let publishResult: { success: boolean; error?: string; mediaId?: string; postId?: string; permalinkUrl?: string };

        if (platformPost.platform === 'instagram') {
          publishResult = await publishToInstagram({
            accessToken: account.token_encrypted,
            instagramAccountId: account.external_account_id,
            videoUrl: assetUrl,
            caption: platformPost.caption_final || '',
          });
        } else if (platformPost.platform === 'facebook') {
          publishResult = await publishToFacebook({
            accessToken: account.token_encrypted,
            pageId: account.external_account_id,
            videoUrl: assetUrl,
            caption: platformPost.caption_final || '',
          });
        } else {
          publishResult = { success: false, error: `${platformPost.platform} not implemented` };
        }

        if (publishResult.success) {
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

          results.push({ platform: platformPost.platform, postId: post.id, success: true });
          console.log(`[Scheduler] ${platformPost.platform} published successfully`);
        } else {
          await adminClient
            .from('platform_posts')
            .update({
              status: 'failed',
              last_error: publishResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', platformPost.id);

          results.push({ platform: platformPost.platform, postId: post.id, success: false, error: publishResult.error });
          console.error(`[Scheduler] ${platformPost.platform} failed:`, publishResult.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        await adminClient
          .from('platform_posts')
          .update({
            status: 'failed',
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', platformPost.id);

        results.push({ platform: platformPost.platform, postId: post.id, success: false, error: errorMessage });
        console.error(`[Scheduler] ${platformPost.platform} error:`, err);
      }

      // Update parent post status based on all platform_posts
      const { data: allPlatformPosts } = await adminClient
        .from('platform_posts')
        .select('status')
        .eq('post_id', post.id);

      const statuses = allPlatformPosts?.map(pp => pp.status) || [];
      const allPublished = statuses.length > 0 && statuses.every(s => s === 'published');
      const anyPublished = statuses.some(s => s === 'published');
      const anyFailed = statuses.some(s => s === 'failed');
      const anyPending = statuses.some(s => ['scheduled', 'queued', 'publishing'].includes(s));

      let newPostStatus: string;
      if (anyPending) {
        newPostStatus = 'publishing'; // Still processing
      } else if (allPublished) {
        newPostStatus = 'published';
      } else if (anyPublished && anyFailed) {
        newPostStatus = 'partially_published';
      } else if (anyFailed) {
        newPostStatus = 'failed';
      } else {
        newPostStatus = 'published';
      }

      await adminClient
        .from('posts')
        .update({
          status: newPostStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[Scheduler] Completed: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      message: 'Scheduler run complete',
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });
  } catch (err) {
    console.error('[Scheduler] Error:', err);
    return NextResponse.json({ error: 'Scheduler error' }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
