-- Add provider column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'pollinations';
