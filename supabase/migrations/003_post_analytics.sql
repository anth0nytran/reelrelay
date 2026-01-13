-- Post Analytics Schema
-- Stores analytics snapshots for published posts from each platform

-- Post Analytics Table
-- Stores time-series analytics data for each platform post
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_post_id UUID NOT NULL REFERENCES platform_posts(id) ON DELETE CASCADE,
  
  -- Core metrics (nullable as not all platforms provide all metrics)
  views INTEGER,                    -- Video views / impressions
  reach INTEGER,                    -- Unique accounts reached
  impressions INTEGER,              -- Total times shown
  
  -- Engagement metrics
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,                    -- Instagram saves
  
  -- Video-specific metrics
  plays INTEGER,                    -- Video plays (may differ from views)
  watch_time_seconds INTEGER,       -- Total watch time (YouTube)
  avg_watch_percentage DECIMAL,     -- Average % of video watched
  
  -- Engagement rate (calculated: engagement / reach or views)
  engagement_rate DECIMAL,
  
  -- Platform-specific data (for any additional metrics)
  platform_data JSONB DEFAULT '{}',
  
  -- Timestamps
  fetched_at TIMESTAMPTZ DEFAULT NOW(),  -- When this snapshot was taken
  period_start TIMESTAMPTZ,              -- Start of analytics period (if applicable)
  period_end TIMESTAMPTZ,                -- End of analytics period (if applicable)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying analytics by platform post
CREATE INDEX idx_post_analytics_platform_post ON post_analytics(platform_post_id);

-- Index for time-series queries
CREATE INDEX idx_post_analytics_fetched ON post_analytics(platform_post_id, fetched_at DESC);

-- Add a column to platform_posts to store the latest analytics snapshot
ALTER TABLE platform_posts
ADD COLUMN latest_analytics JSONB DEFAULT NULL;

-- Add last_analytics_sync to track when we last synced analytics
ALTER TABLE platform_posts
ADD COLUMN last_analytics_sync TIMESTAMPTZ DEFAULT NULL;

-- Function to update latest_analytics on platform_posts when new analytics are inserted
CREATE OR REPLACE FUNCTION update_latest_analytics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE platform_posts
  SET 
    latest_analytics = jsonb_build_object(
      'views', NEW.views,
      'reach', NEW.reach,
      'impressions', NEW.impressions,
      'likes', NEW.likes,
      'comments', NEW.comments,
      'shares', NEW.shares,
      'saves', NEW.saves,
      'plays', NEW.plays,
      'engagement_rate', NEW.engagement_rate,
      'fetched_at', NEW.fetched_at
    ),
    last_analytics_sync = NEW.fetched_at
  WHERE id = NEW.platform_post_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update latest_analytics
CREATE TRIGGER tr_update_latest_analytics
  AFTER INSERT ON post_analytics
  FOR EACH ROW EXECUTE FUNCTION update_latest_analytics();

-- RLS Policies for post_analytics
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their own posts
CREATE POLICY "Users can view own post analytics"
  ON post_analytics FOR SELECT
  USING (
    platform_post_id IN (
      SELECT pp.id FROM platform_posts pp
      JOIN posts p ON p.id = pp.post_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Service role can insert analytics (from sync jobs)
CREATE POLICY "Service role can manage post analytics"
  ON post_analytics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
