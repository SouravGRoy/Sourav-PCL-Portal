-- Function to add a student drive link
CREATE OR REPLACE FUNCTION add_student_drive_link(
  p_group_id UUID,
  p_url TEXT,
  p_description TEXT DEFAULT 'No description'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
  v_count INTEGER;
  v_link_id UUID;
BEGIN
  -- Get the authenticated user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the student profile ID for the authenticated user
  SELECT id INTO v_student_id
  FROM student_profiles
  WHERE user_id = auth.uid();
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found for user';
  END IF;
  
  -- Check if the student already has 5 drive links for this group
  SELECT COUNT(*) INTO v_count
  FROM student_drive_links
  WHERE student_id = v_student_id AND group_id = p_group_id;
  
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 drive links allowed per group';
  END IF;
  
  -- Insert the drive link
  INSERT INTO student_drive_links (
    student_id,
    group_id,
    url,
    description,
    created_at,
    updated_at
  ) VALUES (
    v_student_id,
    p_group_id,
    p_url,
    p_description,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_link_id;
  
  -- Return the newly created link
  SELECT jsonb_build_object(
    'id', id,
    'student_id', student_id,
    'group_id', group_id,
    'url', url,
    'description', description,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM student_drive_links
  WHERE id = v_link_id;
  
  RETURN v_result;
END;
$$;

-- Function to get student drive links for a group
CREATE OR REPLACE FUNCTION get_student_drive_links(
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
BEGIN
  -- Get the authenticated user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the student profile ID for the authenticated user
  SELECT id INTO v_student_id
  FROM student_profiles
  WHERE user_id = auth.uid();
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found for user';
  END IF;
  
  -- Get all drive links for this student and group
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'student_id', student_id,
      'group_id', group_id,
      'url', url,
      'description', description,
      'created_at', created_at,
      'updated_at', updated_at
    )
  ) INTO v_result
  FROM student_drive_links
  WHERE student_id = v_student_id AND group_id = p_group_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Function to remove a student drive link
CREATE OR REPLACE FUNCTION remove_student_drive_link(
  p_link_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_count INTEGER;
BEGIN
  -- Get the authenticated user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the student profile ID for the authenticated user
  SELECT id INTO v_student_id
  FROM student_profiles
  WHERE user_id = auth.uid();
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found for user';
  END IF;
  
  -- Delete the drive link if it belongs to this student
  DELETE FROM student_drive_links
  WHERE id = p_link_id AND student_id = v_student_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Return true if a row was deleted, false otherwise
  RETURN v_count > 0;
END;
$$;
