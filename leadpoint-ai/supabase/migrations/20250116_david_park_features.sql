-- ============================================================================
-- David Park Power Features Migration
-- Viral Growth AI - TikTok Influencer Marketing Platform
-- ============================================================================
-- Features:
-- 1. Ceiling-Based Influencer Scoring
-- 2. Viral Series Management
-- 3. Content Brief Generation
-- 4. Deal Structure Calculator (calculated on-the-fly, no table needed)
-- ============================================================================

-- ============================================================================
-- 1. Ceiling Score Data
-- "An influencer who hit 1M views once has PROVEN viral capability"
-- ============================================================================

CREATE TABLE IF NOT EXISTS ceiling_score_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  best_video_views BIGINT NOT NULL DEFAULT 0,
  viral_videos_count INTEGER NOT NULL DEFAULT 0, -- Videos with 500K+ views
  consistency_score INTEGER NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  ceiling_score INTEGER NOT NULL DEFAULT 0 CHECK (ceiling_score >= 0 AND ceiling_score <= 100),
  average_score INTEGER NOT NULL DEFAULT 0 CHECK (average_score >= 0 AND average_score <= 100),
  hidden_gem_rating INTEGER NOT NULL DEFAULT 0, -- ceiling_score - average_score
  analyzed_videos INTEGER NOT NULL DEFAULT 0,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one score per influencer
  UNIQUE(influencer_id)
);

-- Index for quick lookups
CREATE INDEX idx_ceiling_score_influencer ON ceiling_score_data(influencer_id);
CREATE INDEX idx_ceiling_score_hidden_gem ON ceiling_score_data(hidden_gem_rating DESC);
CREATE INDEX idx_ceiling_score_ceiling ON ceiling_score_data(ceiling_score DESC);

-- ============================================================================
-- 2. Viral Series Management
-- "If a video works, make 10 more versions"
-- ============================================================================

-- Series format type enum
CREATE TYPE series_format_type AS ENUM (
  'educational',
  'storytelling',
  'trend',
  'challenge',
  'review',
  'transformation',
  'other'
);

-- Series status enum
CREATE TYPE series_status AS ENUM (
  'active',
  'paused',
  'completed'
);

-- Series trend direction enum
CREATE TYPE trend_direction AS ENUM (
  'growing',
  'stable',
  'declining'
);

-- Variation type enum
CREATE TYPE variation_type AS ENUM (
  'original',
  'iteration',
  'trend_adaptation',
  'cross_promote'
);

-- Variation status enum
CREATE TYPE variation_status AS ENUM (
  'suggested',
  'approved',
  'in_production',
  'published',
  'rejected'
);

-- Main viral series table
CREATE TABLE IF NOT EXISTS viral_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hook_pattern TEXT, -- The hook that made it viral
  format_type series_format_type NOT NULL DEFAULT 'other',
  total_views BIGINT NOT NULL DEFAULT 0,
  total_videos INTEGER NOT NULL DEFAULT 0,
  avg_views_per_video BIGINT NOT NULL DEFAULT 0,
  trend_direction trend_direction NOT NULL DEFAULT 'stable',
  status series_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for series queries
CREATE INDEX idx_viral_series_campaign ON viral_series(campaign_id);
CREATE INDEX idx_viral_series_influencer ON viral_series(influencer_id);
CREATE INDEX idx_viral_series_status ON viral_series(status);

-- Series videos table
CREATE TABLE IF NOT EXISTS series_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES viral_series(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_id VARCHAR(255),
  title VARCHAR(500),
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  variation_type variation_type NOT NULL DEFAULT 'original',
  performance_vs_series_avg INTEGER NOT NULL DEFAULT 100, -- percentage (100 = avg)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for video queries
CREATE INDEX idx_series_videos_series ON series_videos(series_id);
CREATE INDEX idx_series_videos_posted ON series_videos(posted_at DESC);
CREATE INDEX idx_series_videos_views ON series_videos(views DESC);

-- AI-generated variation ideas
CREATE TABLE IF NOT EXISTS series_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES viral_series(id) ON DELETE CASCADE,
  variation_idea TEXT NOT NULL,
  hook_variation TEXT,
  target_audience_twist TEXT,
  recommended_timing VARCHAR(255),
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status variation_status NOT NULL DEFAULT 'suggested',
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for variation queries
CREATE INDEX idx_series_variations_series ON series_variations(series_id);
CREATE INDEX idx_series_variations_status ON series_variations(status);

-- ============================================================================
-- 3. Content Brief Generation
-- "Brief should match influencer's natural style, not brand voice"
-- ============================================================================

-- Brief format suggestion enum
CREATE TYPE brief_format AS ENUM (
  'talking_head',
  'voiceover',
  'trend_format',
  'storytelling',
  'demo',
  'review'
);

-- Brief status enum
CREATE TYPE brief_status AS ENUM (
  'draft',
  'sent',
  'approved',
  'revision_requested',
  'content_submitted'
);

-- Influencer tone enum
CREATE TYPE influencer_tone AS ENUM (
  'energetic',
  'calm',
  'humorous',
  'educational',
  'casual',
  'professional'
);

-- Influencer pacing enum
CREATE TYPE influencer_pacing AS ENUM (
  'fast',
  'medium',
  'slow'
);

-- Content briefs table
CREATE TABLE IF NOT EXISTS content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  campaign_influencer_id UUID NOT NULL REFERENCES campaign_influencers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  hook_options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of hook strings
  talking_points JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of talking points
  call_to_action TEXT NOT NULL,
  product_mentions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of ProductMention objects
  influencer_style_analysis JSONB NOT NULL DEFAULT '{}'::jsonb, -- InfluencerStyleAnalysis object
  restrictions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of restriction strings
  dos_and_donts JSONB NOT NULL DEFAULT '{"dos": [], "donts": []}'::jsonb,
  estimated_duration VARCHAR(50) NOT NULL DEFAULT '30-60 seconds',
  format_suggestion brief_format NOT NULL DEFAULT 'talking_head',
  status brief_status NOT NULL DEFAULT 'draft',
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for brief queries
CREATE INDEX idx_content_briefs_campaign ON content_briefs(campaign_id);
CREATE INDEX idx_content_briefs_influencer ON content_briefs(influencer_id);
CREATE INDEX idx_content_briefs_campaign_influencer ON content_briefs(campaign_influencer_id);
CREATE INDEX idx_content_briefs_status ON content_briefs(status);

-- ============================================================================
-- Update Triggers (auto-update updated_at)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_ceiling_score_data_updated_at
  BEFORE UPDATE ON ceiling_score_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viral_series_updated_at
  BEFORE UPDATE ON viral_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_briefs_updated_at
  BEFORE UPDATE ON content_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to update series stats when videos change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_series_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_total_views BIGINT;
  v_total_videos INTEGER;
  v_avg_views BIGINT;
BEGIN
  -- Calculate aggregates
  SELECT
    COALESCE(SUM(views), 0),
    COUNT(*),
    COALESCE(AVG(views), 0)::BIGINT
  INTO v_total_views, v_total_videos, v_avg_views
  FROM series_videos
  WHERE series_id = COALESCE(NEW.series_id, OLD.series_id);

  -- Update the series
  UPDATE viral_series
  SET
    total_views = v_total_views,
    total_videos = v_total_videos,
    avg_views_per_video = v_avg_views,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.series_id, OLD.series_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_series_stats
  AFTER INSERT OR UPDATE OR DELETE ON series_videos
  FOR EACH ROW EXECUTE FUNCTION update_series_stats();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE ceiling_score_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;

-- Ceiling Score Data: Users can see scores for influencers in their organization
CREATE POLICY ceiling_score_data_select ON ceiling_score_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM influencers i
      JOIN organization_members om ON i.organization_id = om.organization_id
      WHERE i.id = ceiling_score_data.influencer_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY ceiling_score_data_insert ON ceiling_score_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM influencers i
      JOIN organization_members om ON i.organization_id = om.organization_id
      WHERE i.id = ceiling_score_data.influencer_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY ceiling_score_data_update ON ceiling_score_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM influencers i
      JOIN organization_members om ON i.organization_id = om.organization_id
      WHERE i.id = ceiling_score_data.influencer_id
      AND om.user_id = auth.uid()
    )
  );

-- Viral Series: Users can manage series for campaigns in their organization
CREATE POLICY viral_series_select ON viral_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = viral_series.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY viral_series_insert ON viral_series FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = viral_series.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY viral_series_update ON viral_series FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = viral_series.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY viral_series_delete ON viral_series FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = viral_series.campaign_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Series Videos: Inherit from series permissions
CREATE POLICY series_videos_select ON series_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_videos.series_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY series_videos_insert ON series_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_videos.series_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY series_videos_update ON series_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_videos.series_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY series_videos_delete ON series_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_videos.series_id
      AND om.user_id = auth.uid()
    )
  );

-- Series Variations: Inherit from series permissions
CREATE POLICY series_variations_select ON series_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_variations.series_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY series_variations_insert ON series_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_variations.series_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY series_variations_update ON series_variations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM viral_series vs
      JOIN campaigns c ON vs.campaign_id = c.id
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE vs.id = series_variations.series_id
      AND om.user_id = auth.uid()
    )
  );

-- Content Briefs: Users can manage briefs for campaigns in their organization
CREATE POLICY content_briefs_select ON content_briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = content_briefs.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY content_briefs_insert ON content_briefs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = content_briefs.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY content_briefs_update ON content_briefs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = content_briefs.campaign_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY content_briefs_delete ON content_briefs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = content_briefs.campaign_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE ceiling_score_data IS 'Ceiling-based influencer scoring (David Park methodology) - scores based on max potential, not averages';
COMMENT ON TABLE viral_series IS 'Viral video series tracking - "If a video works, make 10 more versions"';
COMMENT ON TABLE series_videos IS 'Videos belonging to a viral series';
COMMENT ON TABLE series_variations IS 'AI-generated variation ideas for extending viral series';
COMMENT ON TABLE content_briefs IS 'Content briefs for influencer collaborations - matches influencer style, not brand voice';

COMMENT ON COLUMN ceiling_score_data.hidden_gem_rating IS 'ceiling_score - average_score. Higher = more undervalued potential';
COMMENT ON COLUMN viral_series.hook_pattern IS 'The hook pattern that made this series viral';
COMMENT ON COLUMN series_videos.performance_vs_series_avg IS 'Percentage performance vs series average (100 = average)';
COMMENT ON COLUMN content_briefs.influencer_style_analysis IS 'AI analysis of influencer tone, pacing, common hooks, etc.';
