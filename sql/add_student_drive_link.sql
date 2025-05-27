-- Function to add a student drive link that bypasses RLS policies
-- This function needs to be executed in the Supabase SQL editor

-- Create or replace the function
CREATE OR REPLACE FUNCTION add_student_drive_link(
  p_group_id UUID,
  p_student_id UUID,
  p_url TEXT,
  p_description TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the creator (typically admin)
AS $$
DECLARE
  v_count INTEGER;
  v_result JSONB;
BEGIN
  -- Check if the student already has 5 drive links for this group
  SELECT COUNT(*)
  INTO v_count
  FROM student_drive_links
  WHERE group_id = p_group_id AND student_id = p_student_id;
  
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum number of drive links (5) reached';
  END IF;
  
  -- Insert the drive link
  INSERT INTO student_drive_links (
    student_id,
    group_id,
    url,
    description,
    created_at,
    updated_at
  )
  VALUES (
    p_student_id,
    p_group_id,
    p_url,
    p_description,
    NOW(),
    NOW()
  )
  RETURNING to_jsonb(student_drive_links.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_student_drive_link TO authenticated;
