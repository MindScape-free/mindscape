-- Add forking capabilities to mindmaps
ALTER TABLE public.mindmaps
ADD COLUMN forked_from UUID REFERENCES public.mindmaps(id) ON DELETE SET NULL,
ADD COLUMN fork_count INTEGER DEFAULT 0;

-- Create daily challenges tracking table
CREATE TABLE public.user_daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date_string VARCHAR(10) NOT NULL, -- Format: YYYY-MM-DD
    map_id UUID REFERENCES public.mindmaps(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    xp_awarded INTEGER DEFAULT 500,
    UNIQUE(user_id, date_string)
);

-- Enable RLS on new table
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_daily_challenges
CREATE POLICY "Users can view their own daily challenges"
    ON public.user_daily_challenges
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily challenges"
    ON public.user_daily_challenges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to safely increment fork count
CREATE OR REPLACE FUNCTION increment_fork_count(map_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.mindmaps
  SET fork_count = fork_count + 1
  WHERE id = map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
