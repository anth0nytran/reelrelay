import { decryptToken } from '@/lib/encryption';
import { getPlatformRules } from '@/lib/platform/rules';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramPublishOptions {
  accessToken: string;
  instagramAccountId: string;
  videoUrl: string;
  caption: string;
}

export interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  error?: string;
  permalinkUrl?: string;
}

interface ContainerResponse {
  id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface ContainerStatusResponse {
  status_code?: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';
  status?: string;
  error?: {
    message: string;
  };
}

/**
 * Step 1: Create a media container for the Reel
 */
async function createMediaContainer(
  accessToken: string,
  instagramAccountId: string,
  videoUrl: string,
  caption: string
): Promise<ContainerResponse> {
  const params = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    access_token: accessToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${instagramAccountId}/media?${params.toString()}`,
    { method: 'POST' }
  );

  return response.json();
}

/**
 * Step 2: Check container status until ready
 */
async function waitForContainerReady(
  accessToken: string,
  containerId: string,
  maxAttempts: number = 60,
  delayMs: number = 5000
): Promise<{ ready: boolean; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );
    const data: ContainerStatusResponse = await response.json();

    console.log(`[Instagram] Container status check ${attempt + 1}:`, data.status_code);

    if (data.status_code === 'FINISHED') {
      return { ready: true };
    }

    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      return { ready: false, error: data.status || 'Container failed' };
    }

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { ready: false, error: 'Container processing timeout' };
}

/**
 * Step 3: Publish the container
 */
async function publishContainer(
  accessToken: string,
  instagramAccountId: string,
  containerId: string
): Promise<{ id?: string; error?: { message: string } }> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${instagramAccountId}/media_publish?${params.toString()}`,
    { method: 'POST' }
  );

  return response.json();
}

/**
 * Get the permalink for a published post
 */
async function getPostPermalink(
  accessToken: string,
  mediaId: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${accessToken}`
    );
    const data = await response.json();
    return data.permalink || null;
  } catch {
    return null;
  }
}

/**
 * Main function to publish a Reel to Instagram
 */
export async function publishToInstagram(
  options: InstagramPublishOptions
): Promise<InstagramPublishResult> {
  try {
    // Decrypt the access token if it's encrypted
    let accessToken = options.accessToken;
    try {
      accessToken = await decryptToken(options.accessToken);
    } catch {
      // Token might not be encrypted (dev mode)
    }

    // Validate caption length
    const rules = getPlatformRules('instagram');
    if (rules && options.caption.length > rules.caption.maxChars) {
      return {
        success: false,
        error: `Caption exceeds ${rules.caption.maxChars} characters`,
      };
    }

    console.log('[Instagram] Starting publish to account:', options.instagramAccountId);
    console.log('[Instagram] Video URL:', options.videoUrl);

    // Step 1: Create media container
    const containerResult = await createMediaContainer(
      accessToken,
      options.instagramAccountId,
      options.videoUrl,
      options.caption
    );

    if (containerResult.error) {
      console.error('[Instagram] Container creation failed:', containerResult.error);
      return {
        success: false,
        error: containerResult.error.message,
      };
    }

    const containerId = containerResult.id;
    if (!containerId) {
      return {
        success: false,
        error: 'No container ID returned from Instagram',
      };
    }

    console.log('[Instagram] Container created:', containerId);

    // Step 2: Wait for container to be ready
    const containerStatus = await waitForContainerReady(accessToken, containerId);
    if (!containerStatus.ready) {
      return {
        success: false,
        error: containerStatus.error || 'Container processing failed',
      };
    }

    console.log('[Instagram] Container ready, publishing...');

    // Step 3: Publish the container
    const publishResult = await publishContainer(
      accessToken,
      options.instagramAccountId,
      containerId
    );

    if (publishResult.error) {
      console.error('[Instagram] Publish failed:', publishResult.error);
      return {
        success: false,
        error: publishResult.error.message,
      };
    }

    const mediaId = publishResult.id;
    console.log('[Instagram] Published successfully! Media ID:', mediaId);

    // Get permalink
    const permalinkUrl = mediaId ? await getPostPermalink(accessToken, mediaId) : null;

    return {
      success: true,
      mediaId,
      permalinkUrl: permalinkUrl || undefined,
    };
  } catch (err) {
    console.error('[Instagram] Publish error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
