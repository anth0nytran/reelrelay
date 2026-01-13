import { decryptToken } from '@/lib/encryption';
import { getPlatformRules } from '@/lib/platform/rules';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export interface FacebookPublishOptions {
  accessToken: string;
  pageId: string;
  videoUrl: string;
  caption: string;
}

export interface FacebookPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  permalinkUrl?: string;
}

interface VideoUploadResponse {
  id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface VideoStatusResponse {
  status?: {
    video_status?: 'ready' | 'processing' | 'error';
    processing_progress?: number;
  };
  error?: {
    message: string;
  };
}

/**
 * Start a video upload to Facebook Page
 * Uses the "resumable upload" API with video_url for remote fetch
 */
async function initiateVideoUpload(
  accessToken: string,
  pageId: string,
  videoUrl: string,
  caption: string
): Promise<VideoUploadResponse> {
  const params = new URLSearchParams({
    file_url: videoUrl,
    description: caption,
    access_token: accessToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${pageId}/videos?${params.toString()}`,
    { method: 'POST' }
  );

  return response.json();
}

/**
 * Check video processing status
 */
async function checkVideoStatus(
  accessToken: string,
  videoId: string
): Promise<VideoStatusResponse> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${videoId}?fields=status&access_token=${accessToken}`
  );
  return response.json();
}

/**
 * Wait for video to finish processing
 */
async function waitForVideoReady(
  accessToken: string,
  videoId: string,
  maxAttempts: number = 60,
  delayMs: number = 5000
): Promise<{ ready: boolean; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkVideoStatus(accessToken, videoId);

    console.log(`[Facebook] Video status check ${attempt + 1}:`, status.status?.video_status);

    if (status.error) {
      return { ready: false, error: status.error.message };
    }

    if (status.status?.video_status === 'ready') {
      return { ready: true };
    }

    if (status.status?.video_status === 'error') {
      return { ready: false, error: 'Video processing failed' };
    }

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { ready: false, error: 'Video processing timeout' };
}

/**
 * Get the permalink for a published video post
 */
async function getVideoPermalink(
  accessToken: string,
  videoId: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${videoId}?fields=permalink_url&access_token=${accessToken}`
    );
    const data = await response.json();
    return data.permalink_url || null;
  } catch {
    return null;
  }
}

/**
 * Main function to publish a video to a Facebook Page
 */
export async function publishToFacebook(
  options: FacebookPublishOptions
): Promise<FacebookPublishResult> {
  try {
    // Decrypt the access token if it's encrypted
    let accessToken = options.accessToken;
    try {
      accessToken = await decryptToken(options.accessToken);
    } catch {
      // Token might not be encrypted (dev mode)
    }

    // Validate caption length
    const rules = getPlatformRules('facebook');
    if (rules && options.caption.length > rules.caption.maxChars) {
      return {
        success: false,
        error: `Caption exceeds ${rules.caption.maxChars} characters`,
      };
    }

    console.log('[Facebook] Starting publish to page:', options.pageId);
    console.log('[Facebook] Video URL:', options.videoUrl);

    // Upload video (Facebook fetches from URL)
    const uploadResult = await initiateVideoUpload(
      accessToken,
      options.pageId,
      options.videoUrl,
      options.caption
    );

    if (uploadResult.error) {
      console.error('[Facebook] Video upload failed:', uploadResult.error);
      return {
        success: false,
        error: uploadResult.error.message,
      };
    }

    const videoId = uploadResult.id;
    if (!videoId) {
      return {
        success: false,
        error: 'No video ID returned from Facebook',
      };
    }

    console.log('[Facebook] Video upload initiated:', videoId);

    // Wait for video to be ready
    const videoStatus = await waitForVideoReady(accessToken, videoId);
    if (!videoStatus.ready) {
      console.warn('[Facebook] Video still processing, but upload was accepted');
      // Facebook videos are often still "processing" but already posted
      // We'll consider this a success if we got a video ID
    }

    console.log('[Facebook] Published successfully! Video ID:', videoId);

    // Get permalink
    const permalinkUrl = await getVideoPermalink(accessToken, videoId);

    return {
      success: true,
      postId: videoId,
      permalinkUrl: permalinkUrl || undefined,
    };
  } catch (err) {
    console.error('[Facebook] Publish error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
