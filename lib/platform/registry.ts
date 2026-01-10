import type { PlatformId } from '@/lib/database.types';

export type PlatformRegistryEntry = {
  id: PlatformId;
  displayName: string;
  icon: string; // used by UI mapping
  color: string; // hex color string
  implemented: boolean;
  connectUrl?: string;
};

export const PLATFORM_IDS = [
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
] as const satisfies readonly PlatformId[];

export const platformRegistry: Record<PlatformId, PlatformRegistryEntry> = {
  instagram: {
    id: 'instagram',
    displayName: 'Instagram',
    icon: 'Instagram',
    color: '#E1306C',
    implemented: true,
  },
  facebook: {
    id: 'facebook',
    displayName: 'Facebook',
    icon: 'Facebook',
    color: '#1877F2',
    implemented: true,
  },
  linkedin: {
    id: 'linkedin',
    displayName: 'LinkedIn',
    icon: 'Linkedin',
    color: '#0A66C2',
    implemented: false,
  },
  tiktok: {
    id: 'tiktok',
    displayName: 'TikTok',
    icon: 'Music2',
    color: '#00F2EA',
    implemented: false,
  },
  youtube: {
    id: 'youtube',
    displayName: 'YouTube',
    icon: 'Youtube',
    color: '#FF0000',
    implemented: false,
  },
};

// Only platforms that are currently implemented and ready to use
export const IMPLEMENTED_PLATFORM_IDS = PLATFORM_IDS.filter(
  (id) => platformRegistry[id].implemented
) as PlatformId[];

// Helper to check if a platform is implemented
export function isPlatformImplemented(platform: PlatformId): boolean {
  return platformRegistry[platform]?.implemented ?? false;
}



