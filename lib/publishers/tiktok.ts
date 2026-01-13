import { decryptToken } from '@/lib/encryption';
import { getPlatformRules } from '@/lib/platform/rules';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishOptions {
  accessToken: string;
  videoUrl: string;
  caption: string;
  postToInbox?: boolean; // If true, sends to drafts instead of direct publishing
}

export interface TikTokPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
  status?: 'PROCESSING' | 'PUBLISHED' | 'FAILED';
}

export interface TikTokVideoInitResponse {
  data?: {
    publish_id: string;
    upload_url?: string;
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

export interface TikTokPublishStatusResponse {
  data?: {
    status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
    fail_reason?: string;
    publicaly_available_post_id?: string[];
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

/**
 * Initialize a video upload to TikTok
 * This is Step 1 of the TikTok Content Posting API flow
 */
export async function initVideoUpload(
  accessToken: string,
  options: {
    videoUrl: string;
    caption: string;
    postToInbox?: boolean;
  }
): Promise<TikTokVideoInitResponse> {
  const rules = getPlatformRules('tiktok');
  
  // Validate caption length
  if (rules && options.caption.length > rules.caption.maxChars) {
    return {
      error: {
        code: 'CAPTION_TOO_LONG',
        message: `Caption exceeds ${rules.caption.maxChars} characters`,
        log_id: '',
      },
    };
  }

  // Use the appropriate endpoint based on whether posting to inbox or directly
  const endpoint = options.postToInbox
    ? '/post/publish/inbox/video/init/'
    : '/post/publish/video/init/';

  const body = {
    post_info: {
      title: options.caption,
      privacy_level: 'SELF_ONLY', // Start with private, can be changed
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: options.videoUrl,
    },
  };

  const response = await fetch(`${TIKTOK_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data as TikTokVideoInitResponse;
}

/**
 * Check the status of a TikTok video publish
 */
export async function getPublishStatus(
  accessToken: string,
  publishId: string
): Promise<TikTokPublishStatusResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  const data = await response.json();
  return data as TikTokPublishStatusResponse;
}

/**
 * Poll for publish completion with exponential backoff
 */
export async function waitForPublishComplete(
  accessToken: string,
  publishId: string,
  maxAttempts: number = 30,
  initialDelayMs: number = 2000
): Promise<TikTokPublishStatusResponse> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxAttempts) {
    const status = await getPublishStatus(accessToken, publishId);

    if (status.error) {
      return status;
    }

    const publishStatus = status.data?.status;

    // Terminal states
    if (publishStatus === 'PUBLISH_COMPLETE' || publishStatus === 'SEND_TO_USER_INBOX') {
      return status;
    }

    if (publishStatus === 'FAILED') {
      return {
        error: {
          code: 'PUBLISH_FAILED',
          message: status.data?.fail_reason || 'Video publish failed',
          log_id: '',
        },
      };
    }

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 30000); // Cap at 30 seconds
    attempt++;
  }

  return {
    error: {
      code: 'TIMEOUT',
      message: 'Publish status check timed out',
      log_id: '',
    },
  };
}

/**
 * Main function to publish a video to TikTok
 */
export async function publishToTikTok(options: TikTokPublishOptions): Promise<TikTokPublishResult> {
  try {
    // Decrypt the access token if it's encrypted
    let accessToken = options.accessToken;
    try {
      accessToken = await decryptToken(options.accessToken);
    } catch {
      // Token might not be encrypted (dev mode)
    }

    // Step 1: Initialize the video upload
    const initResult = await initVideoUpload(accessToken, {
      videoUrl: options.videoUrl,
      caption: options.caption,
      postToInbox: options.postToInbox,
    });

    if (initResult.error) {
      return {
        success: false,
        error: initResult.error.message,
      };
    }

    const publishId = initResult.data?.publish_id;
    if (!publishId) {
      return {
        success: false,
        error: 'No publish ID returned from TikTok',
      };
    }

    // Step 2: Wait for publish to complete
    const statusResult = await waitForPublishComplete(accessToken, publishId);

    if (statusResult.error) {
      return {
        success: false,
        publishId,
        error: statusResult.error.message,
        status: 'FAILED',
      };
    }

    const finalStatus = statusResult.data?.status;

    return {
      success: finalStatus === 'PUBLISH_COMPLETE' || finalStatus === 'SEND_TO_USER_INBOX',
      publishId,
      status: finalStatus === 'PUBLISH_COMPLETE' || finalStatus === 'SEND_TO_USER_INBOX' 
        ? 'PUBLISHED' 
        : 'FAILED',
    };
  } catch (err) {
    console.error('TikTok publish error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      status: 'FAILED',
    };
  }
}

/**
 * Refresh a TikTok access token using the refresh token
 */
export async function refreshTikTokToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string
): Promise<{
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error.message || 'Token refresh failed' };
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Token refresh failed',
    };
  }
}

/**
 * Validate video meets TikTok requirements before publishing
 */
export function validateVideoForTikTok(video: {
  durationSeconds?: number;
  mimeType?: string;
  fileSizeBytes?: number;
}): { valid: boolean; errors: string[] } {
  const rules = getPlatformRules('tiktok');
  const errors: string[] = [];

  if (!rules) {
    return { valid: true, errors: [] };
  }

  // Check duration
  if (video.durationSeconds !== undefined) {
    if (video.durationSeconds < rules.video.minDuration) {
      errors.push(`Video too short. Minimum duration is ${rules.video.minDuration} seconds.`);
    }
    if (video.durationSeconds > rules.video.maxDuration) {
      errors.push(`Video too long. Maximum duration is ${rules.video.maxDuration} seconds.`);
    }
  }

  // Check file size (287MB max for TikTok)
  if (video.fileSizeBytes !== undefined) {
    const maxBytes = 287 * 1024 * 1024; // 287MB
    if (video.fileSizeBytes > maxBytes) {
      errors.push('Video file too large. Maximum size is 287MB.');
    }
  }

  // Check format
  if (video.mimeType) {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedMimes.includes(video.mimeType)) {
      errors.push('Unsupported video format. Use MP4, WebM, or MOV.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
