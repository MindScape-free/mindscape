-- Create map_cache table for caching generated mind map responses
CREATE TABLE IF NOT EXISTS map_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_key TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index the query_key for quick sub-millisecond lookups
CREATE INDEX IF NOT EXISTS idx_map_cache_query_key ON map_cache(query_key);

-- Enable RLS
ALTER TABLE map_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache entries
CREATE POLICY "Allow authenticated read access to map_cache"
    ON map_cache FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert cache entries
CREATE POLICY "Allow authenticated insert access to map_cache"
    ON map_cache FOR INSERT
    TO authenticated
    WITH CHECK (true);
