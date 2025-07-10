-- Poetry App Database Schema
-- Migration: 20241203000001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ================================================
-- USERS TABLE (extends Supabase auth.users)
-- ================================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium')),
  subscription_expires_at TIMESTAMPTZ,
  total_poems_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- IMAGES TABLE
-- ================================================
CREATE TABLE public.images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  original_url TEXT NOT NULL,
  compressed_url TEXT,
  thumbnail_url TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  format TEXT, -- 'jpeg', 'png', 'webp', etc.
  metadata JSONB DEFAULT '{}', -- EXIF data, etc.
  upload_source TEXT DEFAULT 'camera' CHECK (upload_source IN ('camera', 'gallery')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- POEMS TABLE
-- ================================================
CREATE TABLE public.poems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
  
  -- Poem content
  original_text TEXT NOT NULL,
  formatted_text TEXT NOT NULL,
  language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en', 'ja', 'zh')),
  style TEXT DEFAULT 'modern' CHECK (style IN ('romantic', 'nature', 'minimalist', 'classical', 'modern', 'melancholic', 'joyful', 'mystical')),
  
  -- Location data
  location_point GEOGRAPHY(POINT, 4326), -- PostGIS point for efficient location queries
  location_address TEXT,
  
  -- Poem metadata
  metadata JSONB DEFAULT '{}', -- line count, word count, detected style, etc.
  
  -- Engagement metrics
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- POEM_GENERATIONS TABLE (for tracking API usage and performance)
-- ================================================
CREATE TABLE public.poem_generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poem_id UUID REFERENCES public.poems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- API generation details
  model_used TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  generation_time_ms INTEGER,
  
  -- Request parameters
  parameters JSONB DEFAULT '{}', -- temperature, max_tokens, style, etc.
  
  -- Success/failure tracking
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'retry')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- USER_REMINDERS TABLE (for location-based notifications)
-- ================================================
CREATE TABLE public.user_reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  poem_id UUID REFERENCES public.poems(id) ON DELETE CASCADE NOT NULL,
  
  location_point GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_meters INTEGER DEFAULT 50,
  notification_title TEXT,
  notification_body TEXT,
  
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- USER_SESSIONS TABLE (for analytics and usage tracking)
-- ================================================
CREATE TABLE public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Activity tracking
  poems_generated INTEGER DEFAULT 0,
  images_captured INTEGER DEFAULT 0,
  images_selected INTEGER DEFAULT 0,
  
  -- Device/app info
  device_info JSONB DEFAULT '{}',
  app_version TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription ON public.users(subscription_type, subscription_expires_at);

-- Images indexes
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);

-- Poems indexes
CREATE INDEX idx_poems_user_id ON public.poems(user_id);
CREATE INDEX idx_poems_created_at ON public.poems(created_at DESC);
CREATE INDEX idx_poems_language ON public.poems(language);
CREATE INDEX idx_poems_style ON public.poems(style);
CREATE INDEX idx_poems_is_public ON public.poems(is_public);
CREATE INDEX idx_poems_is_favorite ON public.poems(is_favorite);

-- Location-based index for efficient geo queries
CREATE INDEX idx_poems_location ON public.poems USING GIST(location_point);
CREATE INDEX idx_reminders_location ON public.user_reminders USING GIST(location_point);

-- Generation tracking indexes
CREATE INDEX idx_generations_user_id ON public.poem_generations(user_id);
CREATE INDEX idx_generations_created_at ON public.poem_generations(created_at DESC);
CREATE INDEX idx_generations_status ON public.poem_generations(status);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_sessions_created_at ON public.user_sessions(created_at DESC);

-- Reminders indexes
CREATE INDEX idx_reminders_user_id ON public.user_reminders(user_id);
CREATE INDEX idx_reminders_active ON public.user_reminders(is_active);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poem_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Images policies
CREATE POLICY "Users can read own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Poems policies
CREATE POLICY "Users can read own poems" ON public.poems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read public poems" ON public.poems
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own poems" ON public.poems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own poems" ON public.poems
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own poems" ON public.poems
  FOR DELETE USING (auth.uid() = user_id);

-- Poem generations policies
CREATE POLICY "Users can read own generations" ON public.poem_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON public.poem_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User reminders policies
CREATE POLICY "Users can manage own reminders" ON public.user_reminders
  FOR ALL USING (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Users can read own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- ================================================
-- TRIGGERS for updated_at timestamps
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poems_updated_at BEFORE UPDATE ON public.poems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to get poems within radius of a location
CREATE OR REPLACE FUNCTION get_poems_near_location(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters INTEGER DEFAULT 100,
  user_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  poem_id UUID,
  distance_meters FLOAT,
  text TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    ST_Distance(p.location_point, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326))::FLOAT as distance,
    p.formatted_text,
    p.created_at
  FROM public.poems p
  WHERE 
    ST_DWithin(
      p.location_point, 
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326),
      radius_meters
    )
    AND (user_uuid IS NULL OR p.user_id = user_uuid)
    AND p.location_point IS NOT NULL
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's total poem count
CREATE OR REPLACE FUNCTION increment_user_poem_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET total_poems_generated = total_poems_generated + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment poem count
CREATE TRIGGER increment_poem_count_trigger
  AFTER INSERT ON public.poems
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_poem_count();

-- ================================================
-- INITIAL DATA / CONSTRAINTS
-- ================================================

-- Ensure location coordinates are valid
ALTER TABLE public.poems ADD CONSTRAINT valid_location_point 
  CHECK (location_point IS NULL OR ST_IsValid(location_point));

ALTER TABLE public.user_reminders ADD CONSTRAINT valid_reminder_location 
  CHECK (ST_IsValid(location_point));

-- Ensure reasonable radius values
ALTER TABLE public.user_reminders ADD CONSTRAINT reasonable_radius 
  CHECK (radius_meters >= 10 AND radius_meters <= 1000);

-- Ensure positive counts
ALTER TABLE public.poems ADD CONSTRAINT positive_counts 
  CHECK (like_count >= 0 AND share_count >= 0 AND view_count >= 0);

ALTER TABLE public.users ADD CONSTRAINT positive_poem_count 
  CHECK (total_poems_generated >= 0);

-- Ensure valid token counts
ALTER TABLE public.poem_generations ADD CONSTRAINT valid_token_counts 
  CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0);

COMMENT ON TABLE public.users IS 'Extended user profiles with app-specific data';
COMMENT ON TABLE public.images IS 'Uploaded/captured images with metadata';
COMMENT ON TABLE public.poems IS 'Generated poems with location and engagement data';
COMMENT ON TABLE public.poem_generations IS 'Tracking for API usage and performance analytics';
COMMENT ON TABLE public.user_reminders IS 'Location-based reminder settings for poems';
COMMENT ON TABLE public.user_sessions IS 'User session tracking for analytics';

COMMENT ON COLUMN public.poems.location_point IS 'PostGIS geography point for efficient location queries';
COMMENT ON COLUMN public.poems.metadata IS 'JSON metadata: {lineCount, wordCount, detectedStyle, estimatedReadingTime, etc.}';
COMMENT ON COLUMN public.poem_generations.parameters IS 'JSON parameters: {temperature, maxTokens, style, language, preset}'; 