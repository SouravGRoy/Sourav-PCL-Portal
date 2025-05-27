-- Update student_profiles table to include group_usn field if not already present
ALTER TABLE IF EXISTS student_profiles 
ADD COLUMN IF NOT EXISTS group_usn TEXT;

-- Ensure student_drive_links table has all required fields
ALTER TABLE IF EXISTS student_drive_links
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a constraint to limit the number of drive links per student per group
-- First, create a function to check the number of links
CREATE OR REPLACE FUNCTION check_max_drive_links()
RETURNS TRIGGER AS $$
DECLARE
  link_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO link_count
  FROM student_drive_links
  WHERE student_id = NEW.student_id AND group_id = NEW.group_id;
  
  IF link_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 drive links allowed per student per group';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS enforce_max_drive_links ON student_drive_links;

-- Create the trigger
CREATE TRIGGER enforce_max_drive_links
BEFORE INSERT ON student_drive_links
FOR EACH ROW
EXECUTE FUNCTION check_max_drive_links();

-- Update RLS policies for student_drive_links
-- Allow students to view their own drive links
CREATE POLICY IF NOT EXISTS "Students can view their drive links" ON student_drive_links
  FOR SELECT
  USING (auth.uid() = student_id);

-- Allow students to insert their own drive links
CREATE POLICY IF NOT EXISTS "Students can insert drive links" ON student_drive_links
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Allow students to update their own drive links
CREATE POLICY IF NOT EXISTS "Students can update their drive links" ON student_drive_links
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Allow students to delete their own drive links
CREATE POLICY IF NOT EXISTS "Students can delete their drive links" ON student_drive_links
  FOR DELETE
  USING (auth.uid() = student_id);

-- Allow faculty to view drive links for students in their groups
CREATE POLICY IF NOT EXISTS "Faculty can view drive links for their group members" ON student_drive_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = student_drive_links.group_id
      AND groups.faculty_id = auth.uid()
    )
  );

-- Update group_members table to include additional fields if needed
ALTER TABLE IF EXISTS group_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create a view to make it easier to query group members with their details
CREATE OR REPLACE VIEW group_members_with_details AS
SELECT 
  gm.id,
  gm.group_id,
  gm.student_id,
  gm.joined_at,
  gm.status,
  g.name AS group_name,
  g.faculty_id,
  g.pcl_group_no,
  p.name AS student_name,
  sp.usn,
  sp.class,
  sp.semester,
  sp.group_usn
FROM 
  group_members gm
JOIN 
  groups g ON gm.group_id = g.id
JOIN 
  profiles p ON gm.student_id = p.id
LEFT JOIN 
  student_profiles sp ON p.id = sp.user_id;

-- Create a function to get group members with drive links
CREATE OR REPLACE FUNCTION get_group_members_with_drive_links(group_id UUID)
RETURNS TABLE (
  id UUID,
  group_id UUID,
  student_id UUID,
  name TEXT,
  usn TEXT,
  class TEXT,
  semester TEXT,
  group_usn TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  drive_links JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.group_id,
    gm.student_id,
    p.name,
    sp.usn,
    sp.class,
    sp.semester,
    sp.group_usn,
    gm.joined_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sdl.id,
            'url', sdl.url,
            'description', sdl.description,
            'created_at', sdl.created_at,
            'updated_at', sdl.updated_at
          )
        )
        FROM student_drive_links sdl
        WHERE sdl.student_id = gm.student_id AND sdl.group_id = gm.group_id
      ),
      '[]'::jsonb
    ) AS drive_links
  FROM 
    group_members gm
  JOIN 
    profiles p ON gm.student_id = p.id
  LEFT JOIN 
    student_profiles sp ON p.id = sp.user_id
  WHERE 
    gm.group_id = $1;
END;
$$ LANGUAGE plpgsql;
