-- Add personal_email column to staff_details table
ALTER TABLE staff_details ADD COLUMN IF NOT EXISTS personal_email TEXT;
