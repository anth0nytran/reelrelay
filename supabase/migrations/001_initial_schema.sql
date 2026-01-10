-- ATN Social Publisher - Initial Schema
-- Run this migration to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE platform_id AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'youtube');
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'queued', 'publishing', 'published', 'failed', 'canceled');
CREATE TYPE platform_post_status AS ENUM ('scheduled', 'queued', 'publishing', 'published', 'failed', 'canceled');

-- Connected Accounts
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform platform_id NOT NULL,
  external_account_id TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform, external_account_id)
);

CREATE INDEX idx_connected_accounts_user_platform ON connected_accounts(user_id, platform);

-- Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  duration_seconds DECIMAL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_user ON assets(user_id);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  context JSONB DEFAULT '{}',
  status post_status DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_status ON posts(user_id, status);
CREATE INDEX idx_posts_scheduled ON posts(status, scheduled_for) WHERE status = 'scheduled';

-- Caption Sets
CREATE TABLE caption_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  generated_by_model TEXT NOT NULL,
  raw_output JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caption_sets_post ON caption_sets(post_id);

-- Platform Posts
CREATE TABLE platform_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform platform_id NOT NULL,
  caption_selected TEXT,
  caption_final TEXT,
  status platform_post_status DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  external_url TEXT,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  idempotency_key UUID DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id, platform)
);

CREATE INDEX idx_platform_posts_post ON platform_posts(post_id);
CREATE INDEX idx_platform_posts_status_scheduled ON platform_posts(status, scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_platform_posts_idempotency ON platform_posts(idempotency_key);

-- OAuth States (for CSRF protection during OAuth flow)
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform platform_id NOT NULL,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Job Events (audit log)
CREATE TABLE job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_post_id UUID NOT NULL REFERENCES platform_posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_events_platform_post ON job_events(platform_post_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tr_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_platform_posts_updated_at
  BEFORE UPDATE ON platform_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Scheduler claim function (atomic claiming of due platform posts)
CREATE OR REPLACE FUNCTION claim_due_platform_posts(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  platform platform_id,
  caption_final TEXT,
  scheduled_for TIMESTAMPTZ,
  idempotency_key UUID,
  is_late BOOLEAN,
  asset_url TEXT,
  user_id UUID
) AS $$
DECLARE
  late_threshold INTERVAL := '5 minutes';
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT pp.id
    FROM platform_posts pp
    JOIN posts p ON p.id = pp.post_id
    WHERE pp.status = 'scheduled'
      AND pp.scheduled_for <= NOW()
      AND p.status = 'scheduled'
    ORDER BY pp.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE OF pp SKIP LOCKED
  ),
  updated AS (
    UPDATE platform_posts pp
    SET status = 'queued', updated_at = NOW()
    FROM claimed c
    WHERE pp.id = c.id
    RETURNING pp.*
  )
  SELECT
    u.id,
    u.post_id,
    u.platform,
    u.caption_final,
    u.scheduled_for,
    u.idempotency_key,
    (u.scheduled_for < NOW() - late_threshold) AS is_late,
    a.public_url AS asset_url,
    p.user_id
  FROM updated u
  JOIN posts p ON p.id = u.post_id
  JOIN assets a ON a.id = p.asset_id;

  -- Also update parent posts to queued if all their platform_posts are now queued
  UPDATE posts p
  SET status = 'queued', updated_at = NOW()
  WHERE p.status = 'scheduled'
    AND NOT EXISTS (
      SELECT 1 FROM platform_posts pp
      WHERE pp.post_id = p.id AND pp.status = 'scheduled'
    );
END;
$$ LANGUAGE plpgsql;
