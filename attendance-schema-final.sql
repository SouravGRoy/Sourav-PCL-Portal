-- ===================================================================
-- ATTENDANCE SYSTEM DATABASE SCHEMA FOR EXISTING DATABASE
-- ===================================================================
-- Comprehensive attendance system with QR codes, geolocation, and notifications
-- Designed to integrate with existing groups, profiles, and student_profiles tables

-- First, create the function for updating timestamps (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================================================
-- 1. ATTENDANCE SESSIONS TABLE
-- ===================================================================
-- Stores faculty-created attendance sessions with QR codes and location data
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT NOT NULL, -- e.g., "Morning Lecture", "Lab Session 1"
  session_type TEXT NOT NULL CHECK (session_type IN ('lecture', 'lab', 'tutorial', 'seminar', 'practical')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  
  -- QR Code and Time Validation
  qr_code_token TEXT NOT NULL UNIQUE, -- Unique token for QR code generation
  qr_expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- QR code expiration time
  qr_duration_minutes INTEGER NOT NULL DEFAULT 5, -- Configurable QR duration
  
  -- Geolocation Validation
  faculty_latitude DECIMAL(10, 8), -- Faculty's location when starting session
  faculty_longitude DECIMAL(11, 8),
  allowed_radius_meters INTEGER NOT NULL DEFAULT 20, -- Configurable radius
  
  -- Session Status
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  
  -- Late Entry Settings
  allow_late_entry BOOLEAN DEFAULT true,
  late_entry_deadline TIMESTAMP WITH TIME ZONE, -- Manual deadline for late entries
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_qr_expiry CHECK (qr_expires_at > start_time),
  CONSTRAINT valid_session_duration CHECK (end_time IS NULL OR end_time > start_time)
);

-- ===================================================================
-- 2. ATTENDANCE RECORDS TABLE
-- ===================================================================
-- Individual student check-ins with geolocation validation
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Attendance Status
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Geolocation Data (for proxy prevention)
  student_latitude DECIMAL(10, 8),
  student_longitude DECIMAL(11, 8),
  distance_from_faculty_meters DECIMAL(8, 2), -- Calculated distance
  
  -- Check-in Method
  check_in_method TEXT NOT NULL CHECK (check_in_method IN ('qr_scan', 'manual_faculty', 'manual_late')) DEFAULT 'qr_scan',
  
  -- Manual Override Data
  marked_by UUID REFERENCES public.profiles(id), -- Faculty who manually marked (if applicable)
  manual_reason TEXT, -- Reason for manual marking
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_student_session UNIQUE(session_id, student_id),
  CONSTRAINT valid_geolocation CHECK (
    (student_latitude IS NULL AND student_longitude IS NULL) OR 
    (student_latitude BETWEEN -90 AND 90 AND student_longitude BETWEEN -180 AND 180)
  )
);

-- ===================================================================
-- 3. CLASS ATTENDANCE SETTINGS TABLE
-- ===================================================================
-- Per-class minimum attendance requirements and configurations
CREATE TABLE IF NOT EXISTS public.class_attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Attendance Requirements
  minimum_attendance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 75.00 CHECK (minimum_attendance_percentage BETWEEN 0 AND 100),
  
  -- Notification Settings
  enable_low_attendance_notifications BOOLEAN DEFAULT true,
  notification_threshold_percentage DECIMAL(5, 2) DEFAULT 70.00 CHECK (notification_threshold_percentage BETWEEN 0 AND 100),
  notification_frequency_days INTEGER DEFAULT 7, -- How often to send notifications
  
  -- Session Settings
  default_session_duration_minutes INTEGER DEFAULT 60,
  default_qr_duration_minutes INTEGER DEFAULT 5 CHECK (default_qr_duration_minutes BETWEEN 1 AND 30),
  default_allowed_radius_meters INTEGER DEFAULT 20 CHECK (default_allowed_radius_meters BETWEEN 5 AND 100),
  
  -- Late Entry Policy
  allow_late_entry_by_default BOOLEAN DEFAULT true,
  default_late_entry_hours INTEGER DEFAULT 24, -- Hours after session to allow manual marking
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_notification_threshold CHECK (notification_threshold_percentage <= minimum_attendance_percentage)
);

-- ===================================================================
-- 4. ATTENDANCE NOTIFICATIONS TABLE
-- ===================================================================
-- Track low attendance notifications sent to students
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification Data
  notification_type TEXT NOT NULL CHECK (notification_type IN ('low_attendance_warning', 'critical_attendance_alert')),
  current_attendance_percentage DECIMAL(5, 2) NOT NULL,
  required_attendance_percentage DECIMAL(5, 2) NOT NULL,
  total_sessions INTEGER NOT NULL,
  attended_sessions INTEGER NOT NULL,
  
  -- Notification Status
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Message Content
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- VIEWS FOR EASY DATA ACCESS
-- ===================================================================

-- View: Attendance Summary by Student and Class
CREATE OR REPLACE VIEW public.attendance_summary AS
SELECT 
  ar.student_id,
  ar.group_id,
  g.name as group_name,
  COALESCE(sp.name, 'Unknown Student') as student_name,
  COALESCE(sp.usn, 'N/A') as student_usn,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as attended_sessions,
  COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_sessions,
  COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_sessions,
  COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_sessions,
  COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_sessions,
  ROUND(
    (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 
    2
  ) as attendance_percentage
FROM public.attendance_records ar
JOIN public.groups g ON ar.group_id = g.id
JOIN public.profiles p ON ar.student_id = p.id
LEFT JOIN public.student_profiles sp ON p.id = sp.user_id
GROUP BY ar.student_id, ar.group_id, g.name, sp.name, sp.usn;

-- View: Active Sessions with QR Status
CREATE OR REPLACE VIEW public.active_attendance_sessions AS
SELECT 
  s.*,
  g.name as group_name,
  g.subject,
  g.subject_code,
  COALESCE(fp.name, 'Unknown Faculty') as faculty_name,
  CASE 
    WHEN s.qr_expires_at > NOW() THEN 'active'
    WHEN s.status = 'active' THEN 'expired'
    ELSE 'inactive'
  END as qr_status,
  EXTRACT(EPOCH FROM (s.qr_expires_at - NOW()))/60 as minutes_until_qr_expiry
FROM public.attendance_sessions s
JOIN public.groups g ON s.group_id = g.id
JOIN public.profiles p ON s.faculty_id = p.id
LEFT JOIN public.faculty_profiles fp ON p.id = fp.user_id
WHERE s.status = 'active';

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Attendance Sessions
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_group_id ON public.attendance_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty_id ON public.attendance_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_qr_token ON public.attendance_sessions(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date);

-- Attendance Records
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_group_id ON public.attendance_records(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_check_in_time ON public.attendance_records(check_in_time);

-- Class Settings
CREATE INDEX IF NOT EXISTS idx_class_attendance_settings_group_id ON public.class_attendance_settings(group_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_settings_faculty_id ON public.class_attendance_settings(faculty_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_student_id ON public.attendance_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_group_id ON public.attendance_notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_sent_at ON public.attendance_notifications(sent_at);

-- ===================================================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

-- Attendance Sessions Policies
CREATE POLICY "Faculty can manage their own attendance sessions" ON public.attendance_sessions
  FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY "Students can view sessions for their groups" ON public.attendance_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = attendance_sessions.group_id 
      AND gm.student_id = auth.uid()
    )
  );

-- Attendance Records Policies
CREATE POLICY "Faculty can view all attendance records for their groups" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = attendance_records.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can insert/update attendance records for their groups" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = attendance_records.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own attendance records" ON public.attendance_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own attendance records" ON public.attendance_records
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Class Attendance Settings Policies
CREATE POLICY "Faculty can manage their group attendance settings" ON public.class_attendance_settings
  FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY "Students can view attendance settings for their groups" ON public.class_attendance_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = class_attendance_settings.group_id 
      AND gm.student_id = auth.uid()
    )
  );

-- Attendance Notifications Policies
CREATE POLICY "Students can view their own attendance notifications" ON public.attendance_notifications
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Faculty can view notifications for their group students" ON public.attendance_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = attendance_notifications.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

-- ===================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===================================================================

-- Update timestamps
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_attendance_settings_updated_at
  BEFORE UPDATE ON public.class_attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- HELPFUL FUNCTIONS
-- ===================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 DECIMAL, lon1 DECIMAL, 
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  radius_earth DECIMAL := 6371000; -- Earth's radius in meters
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN radius_earth * c;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token() RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SAMPLE DATA INSERTION (for testing)
-- ===================================================================

-- Insert default attendance settings for existing groups
INSERT INTO public.class_attendance_settings (group_id, faculty_id, minimum_attendance_percentage)
SELECT 
  g.id,
  g.faculty_id,
  75.00
FROM public.groups g
WHERE g.faculty_id IS NOT NULL
ON CONFLICT (group_id) DO NOTHING;

-- ===================================================================
-- ATTENDANCE ACTIVITY TRACKING (Optional)
-- ===================================================================

-- Insert into activities table when attendance sessions are created (if activities table exists)
-- This assumes you have an activities table for tracking group activities
-- CREATE OR REPLACE FUNCTION notify_attendance_session_created() RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.activities (
--     group_id, 
--     actor_id, 
--     actor_role,
--     type, 
--     description,
--     metadata
--   ) VALUES (
--     NEW.group_id,
--     NEW.faculty_id,
--     'faculty',
--     'attendance_session_created',
--     'Attendance session "' || NEW.session_name || '" was started',
--     jsonb_build_object(
--       'session_id', NEW.id,
--       'session_type', NEW.session_type,
--       'qr_duration', NEW.qr_duration_minutes
--     )
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER attendance_session_activity_trigger
--   AFTER INSERT ON public.attendance_sessions
--   FOR EACH ROW EXECUTE FUNCTION notify_attendance_session_created();

COMMENT ON TABLE public.attendance_sessions IS 'Faculty-created attendance sessions with QR codes and geolocation';
COMMENT ON TABLE public.attendance_records IS 'Individual student attendance records with location verification';
COMMENT ON TABLE public.class_attendance_settings IS 'Per-class attendance requirements and notification settings';
COMMENT ON TABLE public.attendance_notifications IS 'Low attendance notifications sent to students';
