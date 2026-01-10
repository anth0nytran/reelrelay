-- ATN Social Publisher - Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE caption_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

-- Connected Accounts: Users can only see sanitized info via API, not direct access
-- Service role bypasses RLS for backend operations
DROP POLICY IF EXISTS "connected_accounts_service_only" ON connected_accounts;
CREATE POLICY "connected_accounts_service_only" ON connected_accounts
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Assets: Users can manage their own assets
DROP POLICY IF EXISTS "assets_select_own" ON assets;
CREATE POLICY "assets_select_own" ON assets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "assets_insert_own" ON assets;
CREATE POLICY "assets_insert_own" ON assets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "assets_delete_own" ON assets;
CREATE POLICY "assets_delete_own" ON assets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Posts: Users can manage their own posts
DROP POLICY IF EXISTS "posts_select_own" ON posts;
CREATE POLICY "posts_select_own" ON posts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Caption Sets: Access through post ownership
DROP POLICY IF EXISTS "caption_sets_select" ON caption_sets;
CREATE POLICY "caption_sets_select" ON caption_sets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = caption_sets.post_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "caption_sets_insert" ON caption_sets;
CREATE POLICY "caption_sets_insert" ON caption_sets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = caption_sets.post_id
      AND p.user_id = auth.uid()
    )
  );

-- Platform Posts: Access through post ownership
DROP POLICY IF EXISTS "platform_posts_select" ON platform_posts;
CREATE POLICY "platform_posts_select" ON platform_posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = platform_posts.post_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "platform_posts_insert" ON platform_posts;
CREATE POLICY "platform_posts_insert" ON platform_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = platform_posts.post_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "platform_posts_update" ON platform_posts;
CREATE POLICY "platform_posts_update" ON platform_posts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = platform_posts.post_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = platform_posts.post_id
      AND p.user_id = auth.uid()
    )
  );

-- OAuth States: Users can only see their own (but typically accessed via API)
DROP POLICY IF EXISTS "oauth_states_service_only" ON oauth_states;
CREATE POLICY "oauth_states_service_only" ON oauth_states
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Job Events: Read-only access through platform_post ownership
DROP POLICY IF EXISTS "job_events_select" ON job_events;
CREATE POLICY "job_events_select" ON job_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_posts pp
      JOIN posts p ON p.id = pp.post_id
      WHERE pp.id = job_events.platform_post_id
      AND p.user_id = auth.uid()
    )
  );
