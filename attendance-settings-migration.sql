-- Function to create default attendance settings for a group
CREATE OR REPLACE FUNCTION create_default_attendance_settings(p_group_id UUID, p_faculty_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert default attendance settings if they don't exist
  INSERT INTO class_attendance_settings (
    group_id,
    faculty_id,
    minimum_attendance_percentage,
    enable_low_attendance_notifications,
    notification_threshold_percentage,
    notification_frequency_days,
    default_session_duration_minutes,
    default_qr_duration_minutes,
    default_allowed_radius_meters,
    allow_late_entry_by_default,
    default_late_entry_hours
  )
  VALUES (
    p_group_id,
    p_faculty_id,
    75.00,
    true,
    70.00,
    7,
    60,
    5,
    20,
    true,
    24
  )
  ON CONFLICT (group_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_attendance_settings(UUID, UUID) TO authenticated;

-- Trigger function to automatically create attendance settings when a group is created
CREATE OR REPLACE FUNCTION auto_create_attendance_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default attendance settings for the new group
  PERFORM create_default_attendance_settings(NEW.id, NEW.faculty_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on groups table
DROP TRIGGER IF EXISTS trigger_auto_create_attendance_settings ON groups;
CREATE TRIGGER trigger_auto_create_attendance_settings
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_attendance_settings();

COMMENT ON FUNCTION create_default_attendance_settings(UUID, UUID) IS 'Creates default attendance settings for a group';
COMMENT ON FUNCTION auto_create_attendance_settings() IS 'Trigger function to automatically create attendance settings when a group is created';
