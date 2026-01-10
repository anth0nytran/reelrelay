import type { PlatformId } from '@/lib/database.types';

export type PlatformCaptionSuggestions = {
  captionOptions: string[];
  hashtags?: string[];
  titleOptions?: string[];
};

export type CaptionOutput = Record<PlatformId, PlatformCaptionSuggestions>;




