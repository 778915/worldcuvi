-- [Fix] Feedback System RLS & RPC Logic

-- 0. Ensure worldcups table has the necessary columns
ALTER TABLE worldcups ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE worldcups ADD COLUMN IF NOT EXISTS unlike_count INTEGER DEFAULT 0;

-- 1. Ensure the logs table exists with correct schema
CREATE TABLE IF NOT EXISTS worldcup_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worldcup_id UUID REFERENCES worldcups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worldcup_id, user_id)
);

-- Ensure is_like column exists if table was created without it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='worldcup_feedback_logs' AND column_name='is_like') THEN
        ALTER TABLE worldcup_feedback_logs ADD COLUMN is_like BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 2. Enable RLS and set policies
ALTER TABLE worldcup_feedback_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view feedback" ON worldcup_feedback_logs;
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON worldcup_feedback_logs;
    DROP POLICY IF EXISTS "Users can manage their own feedback" ON worldcup_feedback_logs;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Anyone can view feedback" ON worldcup_feedback_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own feedback" ON worldcup_feedback_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own feedback" ON worldcup_feedback_logs
    FOR ALL USING (auth.uid() = user_id);


-- 3. Robust RPC Function for handling feedback with TOGGLE support
CREATE OR REPLACE FUNCTION handle_worldcup_feedback(
    target_worldcup_id UUID,
    target_user_id UUID,
    p_is_like BOOLEAN
) RETURNS TEXT AS $$
DECLARE
    old_is_like BOOLEAN;
BEGIN
    -- Check for existing vote
    SELECT f.is_like INTO old_is_like 
    FROM worldcup_feedback_logs f 
    WHERE f.worldcup_id = target_worldcup_id AND f.user_id = target_user_id;

    IF old_is_like IS NULL THEN
        -- New vote: Insert and Increment
        INSERT INTO worldcup_feedback_logs (worldcup_id, user_id, is_like)
        VALUES (target_worldcup_id, target_user_id, p_is_like);
        
        IF p_is_like THEN
            UPDATE worldcups SET like_count = COALESCE(like_count, 0) + 1 WHERE id = target_worldcup_id;
        ELSE
            UPDATE worldcups SET unlike_count = COALESCE(unlike_count, 0) + 1 WHERE id = target_worldcup_id;
        END IF;
        RETURN 'added';

    ELSIF old_is_like = p_is_like THEN
        -- Toggle OFF: Delete and Decrement
        DELETE FROM worldcup_feedback_logs 
        WHERE worldcup_id = target_worldcup_id AND user_id = target_user_id;

        IF p_is_like THEN
            UPDATE worldcups SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = target_worldcup_id;
        ELSE
            UPDATE worldcups SET unlike_count = GREATEST(COALESCE(unlike_count, 0) - 1, 0) WHERE id = target_worldcup_id;
        END IF;
        RETURN 'removed';

    ELSE
        -- Switched vote: Update and Switch Counts
        UPDATE worldcup_feedback_logs 
        SET is_like = p_is_like, created_at = NOW()
        WHERE worldcup_id = target_worldcup_id AND user_id = target_user_id;

        IF p_is_like THEN
            UPDATE worldcups SET 
                like_count = COALESCE(like_count, 0) + 1,
                unlike_count = GREATEST(COALESCE(unlike_count, 0) - 1, 0)
            WHERE id = target_worldcup_id;
        ELSE
            UPDATE worldcups SET 
                unlike_count = COALESCE(unlike_count, 0) + 1,
                like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
            WHERE id = target_worldcup_id;
        END IF;
        RETURN 'switched';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
