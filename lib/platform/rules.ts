import type { PlatformId } from '@/lib/database.types';

// Import all platform rules statically (Next.js doesn't support dynamic JSON imports in edge/serverless)
import instagramRules from '@/rules/instagram.json';
import facebookRules from '@/rules/facebook.json';
import tiktokRules from '@/rules/tiktok.json';
import linkedinRules from '@/rules/linkedin.json';
import youtubeRules from '@/rules/youtube.json';

// Type definitions for platform rules
export interface CaptionRules {
  maxChars: number;
  recommendedChars: number;
  supportsHashtags: boolean;
  recommendedHashtagCount: number;
  maxHashtags: number;
  supportsMentions?: boolean;
  supportsEmojis?: boolean;
  supportsLinks?: boolean;
  // YouTube-specific
  titleMaxChars?: number;
  titleRecommendedChars?: number;
  descriptionMaxChars?: number;
  descriptionRecommendedChars?: number;
  supportsTags?: boolean;
  maxTags?: number;
}

export interface VideoRules {
  supportedFormats: string[];
  minDuration: number;
  maxDuration: number;
  maxFileSize: string;
  recommendedAspectRatios: string[];
  minResolution: string;
  maxResolution?: string;
  frameRateRange?: [number, number];
  codecsSupported?: string[];
  // YouTube-specific
  minDurationShorts?: number;
  maxDurationShorts?: number;
  minDurationRegular?: number;
  maxDurationRegular?: number;
  shortsAspectRatio?: string;
  regularAspectRatios?: string[];
}

export interface ToneRules {
  style: string;
  guidance: string;
  avoidPatterns: string[];
  hashtagPlacement?: string;
}

export interface ApiRules {
  baseUrl: string;
  authUrl?: string;
  tokenUrl?: string;
  uploadUrl?: string;
  authProvider?: string;
  tokenExpiryHours?: number;
  tokenExpiryDays?: number;
  refreshTokenExpiryDays?: number;
  refreshTokenNoExpiry?: boolean;
  scopes?: string[];
  rateLimit: {
    requestsPerHour?: number;
    requestsPerMinute?: number;
    requestsPerDay?: number;
    postsPerDay?: number;
    uploadsPerDay?: number;
    quotaPerDay?: number;
  };
}

export interface PlatformFeatures {
  supportsReels?: boolean;
  supportsStories?: boolean;
  supportsFeed?: boolean;
  supportsCarousel?: boolean;
  supportsLive?: boolean;
  supportsDirectPost?: boolean;
  supportsInboxPost?: boolean;
  supportsDuet?: boolean;
  supportsStitch?: boolean;
  supportsNativeVideo?: boolean;
  supportsArticles?: boolean;
  supportsPolls?: boolean;
  supportsShorts?: boolean;
  supportsRegularVideos?: boolean;
  supportsLiveStreams?: boolean;
  supportsThumbnails?: boolean;
  supportsPlaylists?: boolean;
  requiresBusinessAccount?: boolean;
  requiresFacebookPage?: boolean;
  requiresCreatorAccount?: boolean;
  requiresCompanyPage?: boolean;
  supportsPersonalProfile?: boolean;
  requiresPage?: boolean;
  requiresChannel?: boolean;
}

export interface PlatformRules {
  platform: PlatformId;
  displayName: string;
  caption: CaptionRules;
  video: VideoRules;
  tone: ToneRules;
  features: PlatformFeatures;
  api: ApiRules;
}

// Rules cache
const rulesCache: Partial<Record<PlatformId, PlatformRules>> = {
  instagram: instagramRules as PlatformRules,
  facebook: facebookRules as PlatformRules,
  tiktok: tiktokRules as PlatformRules,
  linkedin: linkedinRules as PlatformRules,
  youtube: youtubeRules as PlatformRules,
};

/**
 * Get platform rules by platform ID
 */
export function getPlatformRules(platform: PlatformId): PlatformRules | null {
  return rulesCache[platform] || null;
}

/**
 * Get all platform rules
 */
export function getAllPlatformRules(): Record<PlatformId, PlatformRules> {
  return rulesCache as Record<PlatformId, PlatformRules>;
}

/**
 * Get caption rules for a platform
 */
export function getCaptionRules(platform: PlatformId): CaptionRules | null {
  const rules = getPlatformRules(platform);
  return rules?.caption || null;
}

/**
 * Get video rules for a platform
 */
export function getVideoRules(platform: PlatformId): VideoRules | null {
  const rules = getPlatformRules(platform);
  return rules?.video || null;
}

/**
 * Get tone guidance for a platform
 */
export function getToneRules(platform: PlatformId): ToneRules | null {
  const rules = getPlatformRules(platform);
  return rules?.tone || null;
}

/**
 * Get API configuration for a platform
 */
export function getApiRules(platform: PlatformId): ApiRules | null {
  const rules = getPlatformRules(platform);
  return rules?.api || null;
}

/**
 * Validate caption length for a platform
 */
export function validateCaptionLength(platform: PlatformId, caption: string): {
  valid: boolean;
  charCount: number;
  maxChars: number;
  overLimit: number;
} {
  const rules = getCaptionRules(platform);
  if (!rules) {
    return { valid: true, charCount: caption.length, maxChars: Infinity, overLimit: 0 };
  }

  const charCount = caption.length;
  const maxChars = rules.maxChars;
  const overLimit = Math.max(0, charCount - maxChars);

  return {
    valid: charCount <= maxChars,
    charCount,
    maxChars,
    overLimit,
  };
}

/**
 * Count hashtags in a caption
 */
export function countHashtags(caption: string): number {
  const matches = caption.match(/#\w+/g);
  return matches ? matches.length : 0;
}

/**
 * Validate hashtag count for a platform
 */
export function validateHashtagCount(platform: PlatformId, caption: string): {
  valid: boolean;
  count: number;
  max: number;
  recommended: number;
} {
  const rules = getCaptionRules(platform);
  if (!rules) {
    return { valid: true, count: 0, max: Infinity, recommended: 0 };
  }

  const count = countHashtags(caption);
  const max = rules.maxHashtags;
  const recommended = rules.recommendedHashtagCount;

  return {
    valid: count <= max,
    count,
    max,
    recommended,
  };
}

/**
 * Build prompt context for AI caption generation based on platform rules
 */
export function buildCaptionPromptContext(platform: PlatformId): string {
  const rules = getPlatformRules(platform);
  if (!rules) return '';

  const parts: string[] = [
    `Platform: ${rules.displayName}`,
    `Max characters: ${rules.caption.maxChars} (recommended: ${rules.caption.recommendedChars})`,
    `Hashtags: ${rules.caption.supportsHashtags ? `Yes, recommended ${rules.caption.recommendedHashtagCount}, max ${rules.caption.maxHashtags}` : 'No'}`,
    `Tone: ${rules.tone.style}`,
    `Guidance: ${rules.tone.guidance}`,
  ];

  if (rules.tone.avoidPatterns.length > 0) {
    parts.push(`Avoid: ${rules.tone.avoidPatterns.join(', ')}`);
  }

  if (rules.tone.hashtagPlacement) {
    parts.push(`Hashtag placement: ${rules.tone.hashtagPlacement}`);
  }

  return parts.join('\n');
}
