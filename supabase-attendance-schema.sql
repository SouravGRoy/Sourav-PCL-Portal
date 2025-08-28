-- ===================================================================
-- ATTENDANCE SYSTEM DATABASE SCHEMA
-- ===================================================================
-- Comprehensive attendance system with QR codes, geolocation, and notifications

-- 1. ATTENDANCE SESSIONS TABLE
-- Stores faculty-created attendance sessions with QR codes and location data
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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

-- 2. ATTENDANCE RECORDS TABLE
-- Individual student check-ins with geolocation validation
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
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
  marked_by UUID REFERENCES profiles(id), -- Faculty who manually marked (if applicable)
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

-- 3. CLASS ATTENDANCE SETTINGS TABLE
-- Per-class minimum attendance requirements and configurations
CREATE TABLE IF NOT EXISTS class_attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  faculty_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
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

-- 4. ATTENDANCE NOTIFICATIONS TABLE
-- Track low attendance notifications sent to students
CREATE TABLE IF NOT EXISTS attendance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
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
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
  ar.student_id,
  ar.group_id,
  g.name as group_name,
  p.name as student_name,
  sp.usn as student_usn,
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
FROM attendance_records ar
JOIN groups g ON ar.group_id = g.id
JOIN profiles p ON ar.student_id = p.id
JOIN student_profiles sp ON p.id = sp.user_id
GROUP BY ar.student_id, ar.group_id, g.name, p.name, sp.usn;

-- View: Active Sessions with QR Status
CREATE OR REPLACE VIEW active_attendance_sessions AS
SELECT 
  s.*,
  g.name as group_name,
  g.subject,
  g.subject_code,
  fp.name as faculty_name,
  CASE 
    WHEN s.qr_expires_at > NOW() THEN 'active'
    WHEN s.status = 'active' THEN 'expired'
    ELSE 'inactive'
  END as qr_status,
  EXTRACT(EPOCH FROM (s.qr_expires_at - NOW()))/60 as minutes_until_qr_expiry
FROM attendance_sessions s
JOIN groups g ON s.group_id = g.id
JOIN profiles p ON s.faculty_id = p.id
LEFT JOIN faculty_profiles fp ON p.id = fp.user_id
WHERE s.status = 'active';

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Attendance Sessions
CREATE INDEX idx_attendance_sessions_group_id ON attendance_sessions(group_id);
CREATE INDEX idx_attendance_sessions_faculty_id ON attendance_sessions(faculty_id);
CREATE INDEX idx_attendance_sessions_qr_token ON attendance_sessions(qr_code_token);
CREATE INDEX idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);

-- Attendance Records
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_group_id ON attendance_records(group_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
CREATE INDEX idx_attendance_records_check_in_time ON attendance_records(check_in_time);

-- Class Settings
CREATE INDEX idx_class_attendance_settings_group_id ON class_attendance_settings(group_id);
CREATE INDEX idx_class_attendance_settings_faculty_id ON class_attendance_settings(faculty_id);

-- Notifications
CREATE INDEX idx_attendance_notifications_student_id ON attendance_notifications(student_id);
CREATE INDEX idx_attendance_notifications_group_id ON attendance_notifications(group_id);
CREATE INDEX idx_attendance_notifications_sent_at ON attendance_notifications(sent_at);

-- ===================================================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notifications ENABLE ROW LEVEL SECURITY;

-- Attendance Sessions Policies
CREATE POLICY "Faculty can manage their own attendance sessions" ON attendance_sessions
  FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY "Students can view sessions for their groups" ON attendance_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = attendance_sessions.group_id 
      AND gm.student_id = auth.uid()
    )
  );

-- Attendance Records Policies
CREATE POLICY "Faculty can view all attendance records for their groups" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = attendance_records.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can insert/update attendance records for their groups" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = attendance_records.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own attendance records" ON attendance_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own attendance records" ON attendance_records
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Class Attendance Settings Policies
CREATE POLICY "Faculty can manage their group attendance settings" ON class_attendance_settings
  FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY "Students can view attendance settings for their groups" ON class_attendance_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = class_attendance_settings.group_id 
      AND gm.student_id = auth.uid()
    )
  );

-- Attendance Notifications Policies
CREATE POLICY "Students can view their own attendance notifications" ON attendance_notifications
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Faculty can view notifications for their group students" ON attendance_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = attendance_notifications.group_id 
      AND g.faculty_id = auth.uid()
    )
  );

-- ===================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===================================================================

-- Update timestamps
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_attendance_settings_updated_at
  BEFORE UPDATE ON class_attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- HELPFUL FUNCTIONS
-- ===================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
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
CREATE OR REPLACE FUNCTION generate_qr_token() RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SAMPLE DATA INSERTION (for testing)
-- ===================================================================

-- Insert default attendance settings for existing groups
INSERT INTO class_attendance_settings (group_id, faculty_id, minimum_attendance_percentage)
SELECT 
  g.id,
  g.faculty_id,
  75.00
FROM groups g
ON CONFLICT (group_id) DO NOTHING;
