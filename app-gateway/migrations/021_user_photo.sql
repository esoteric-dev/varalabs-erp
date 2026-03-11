-- ============================================================================
-- Add photo_url column to users table (for teacher/admin profile photos)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
