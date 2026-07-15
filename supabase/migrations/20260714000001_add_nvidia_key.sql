-- Add nvidia_api_key column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS nvidia_api_key TEXT;
