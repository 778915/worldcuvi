-- Create youtube_cache table for speeding up metadata lookups
CREATE TABLE IF NOT EXISTS youtube_cache (
  id TEXT PRIMARY KEY, -- video_id or playlist_id
  type TEXT NOT NULL DEFAULT 'video', -- 'video', 'playlist'
  title TEXT,
  thumbnail TEXT,
  channel_id TEXT,
  channel_title TEXT,
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_cache_expires_at ON youtube_cache(expires_at);
