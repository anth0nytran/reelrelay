export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlatformId = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'canceled';

export type PlatformPostStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'canceled';

export type PostContext = {
  topic: string;
  targetAudience: string;
  cta: string;
  tone: string;
  location?: string | null;
  brandVoice?: string | null;
};

export type Asset = {
  id: string;
  user_id: string;
  r2_key: string;
  public_url: string;
  mime: string;
  size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  asset_id: string;
  context: Json;
  status: PostStatus;
  scheduled_for: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type CaptionSet = {
  id: string;
  post_id: string;
  generated_by_model: string;
  raw_output: Json;
  created_at: string;
};

export type PlatformPost = {
  id: string;
  post_id: string;
  platform: PlatformId;
  caption_selected: string | null;
  caption_final: string | null;
  status: PlatformPostStatus;
  scheduled_for: string | null;
  started_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  external_url: string | null;
  attempts: number | null;
  last_error: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectedAccount = {
  id: string;
  user_id: string;
  platform: PlatformId;
  external_account_id: string;
  token_encrypted: string;
  token_expires_at: string | null;
  scopes: string[] | null;
  metadata: Json;
  is_primary: boolean | null;
  created_at: string;
  updated_at: string;
};

export type OAuthState = {
  id: string;
  user_id: string;
  platform: PlatformId;
  state: string;
  expires_at: string;
  created_at: string;
};

export type JobEvent = {
  id: string;
  platform_post_id: string;
  event_type: string;
  payload: Json;
  created_at: string;
};

export type ConnectionStatus = {
  platform: PlatformId;
  connected: boolean;
  accounts: Array<{
    id: string;
    name: string;
    externalId: string;
    isPrimary: boolean;
  }>;
};


