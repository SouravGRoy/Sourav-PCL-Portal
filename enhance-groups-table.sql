-- Add new fields to groups table for enhanced class management
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS year TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_subject_code ON groups(subject_code);
CREATE INDEX IF NOT EXISTS idx_groups_semester ON groups(semester);
CREATE INDEX IF NOT EXISTS idx_groups_year ON groups(year);
