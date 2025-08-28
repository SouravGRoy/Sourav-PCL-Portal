export type UserRole = 'superadmin' | 'faculty' | 'student';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile extends Profile {
  usn: string;
  class: string;
  semester: string;
  group_usn: string;
  subject_codes?: string[];
  user_id?: string; // Reference to the profile ID
}

export interface FacultyProfile extends Profile {
  department: string;
  name: string; // Added name field to match updated schema
  user_id?: string; // Reference to the profile ID
}

export interface DriveLink {
  id: string;
  group_id: string;
  student_id: string;
  url: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  faculty_id: string;
  department: string;
  pcl_group_no: string;
  subject?: string;
  subject_code?: string;
  semester?: string;
  year?: string;
  drive_link?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  faculty_name?: string; // Added for UI display purposes
  member_count?: number; // For UI display
  assignment_count?: number; // For UI display
}

export interface StudentDriveLink {
  id: string;
  student_id: string;
  group_id: string;
  url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  usn: string;
  group_usn?: string;
  class?: string;
  semester?: string;
  email?: string;
}

export interface GroupMember {
  id: string;
  group_id?: string;
  student_id?: string;
  name: string;
  usn: string;
  group_usn: string;
  class: string;
  semester: string;
  email?: string;
  drive_links?: DriveLink[];
  joined_at?: string;
  student: {
    id: string;
    name: string;
    usn: string;
    group_usn: string;
    class: string;
    semester: string;
    email?: string;
  };
}

export interface Assignment {
  id: string;
  title: string;
  description?: string; // Make optional to match database schema
  group_id: string;
  due_date: string;
  created_at: string;
  max_score?: number;
  assignment_rubrics?: GradingRubric[];
}

export interface GradingRubric {
  id: string;
  criteria_name: string;
  criteria_description?: string;
  max_points: number;
  order_index: number;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  url: string;
  submitted_at: string;
  status: 'pending' | 'reviewed' | 'draft' | 'submitted' | 'graded' | 'returned';
  feedback?: string;
  total_score?: number;
  is_late?: boolean;
  submission_text?: string;
  submission_url?: string;
  file_attachments?: any[];
  student?: {
    id: string;
    name: string;
    email: string;
  };
}

// ===================================================================
// ATTENDANCE SYSTEM TYPES
// ===================================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type SessionType = 'lecture' | 'lab' | 'tutorial' | 'seminar' | 'practical';
export type SessionStatus = 'active' | 'completed' | 'cancelled';
export type CheckInMethod = 'qr_scan' | 'manual_faculty' | 'manual_late' | 'auto_absent';
export type QRStatus = 'active' | 'expired' | 'inactive';
export type NotificationType = 'low_attendance_warning' | 'critical_attendance_alert';

export interface AttendanceSession {
  id: string;
  group_id: string;
  faculty_id: string;
  session_name: string;
  session_type: SessionType;
  session_date: string;
  start_time: string;
  end_time?: string;
  
  // QR Code and Time Validation
  qr_code_token: string;
  qr_expires_at: string;
  qr_duration_minutes: number;
  
  // Geolocation Validation
  faculty_latitude?: number;
  faculty_longitude?: number;
  allowed_radius_meters: number;
  
  // Session Status
  status: SessionStatus;
  
  // Late Entry Settings
  allow_late_entry: boolean;
  late_entry_deadline?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Additional fields from views/joins
  group_name?: string;
  subject?: string;
  subject_code?: string;
  faculty_name?: string;
  qr_status?: QRStatus;
  minutes_until_qr_expiry?: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  group_id: string;
  
  // Attendance Status
  status: AttendanceStatus;
  check_in_time: string;
  
  // Geolocation Data (for proxy prevention)
  student_latitude?: number;
  student_longitude?: number;
  distance_from_faculty_meters?: number;
  
  // Check-in Method
  check_in_method: CheckInMethod;
  
  // Manual Override Data
  marked_by?: string;
  manual_reason?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Additional fields from joins
  student_name?: string;
  student_usn?: string;
  session_name?: string;
  session_type?: SessionType;
}

export interface ClassAttendanceSettings {
  id: string;
  group_id: string;
  faculty_id: string;
  
  // Attendance Requirements
  minimum_attendance_percentage: number;
  
  // Notification Settings
  enable_low_attendance_notifications: boolean;
  notification_threshold_percentage: number;
  notification_frequency_days: number;
  
  // Session Settings
  default_session_duration_minutes: number;
  default_qr_duration_minutes: number;
  default_allowed_radius_meters: number;
  
  // Late Entry Policy
  allow_late_entry_by_default: boolean;
  default_late_entry_hours: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface AttendanceNotification {
  id: string;
  student_id: string;
  group_id: string;
  
  // Notification Data
  notification_type: NotificationType;
  current_attendance_percentage: number;
  required_attendance_percentage: number;
  total_sessions: number;
  attended_sessions: number;
  
  // Notification Status
  sent_at: string;
  acknowledged_at?: string;
  
  // Message Content
  message_title: string;
  message_body: string;
  
  // Metadata
  created_at: string;
  
  // Additional fields from joins
  group_name?: string;
  student_name?: string;
}

export interface AttendanceSummary {
  student_id: string;
  group_id: string;
  group_name: string;
  student_name: string;
  student_usn: string;
  total_sessions: number;
  attended_sessions: number;
  present_sessions: number;
  late_sessions: number;
  absent_sessions: number;
  excused_sessions: number;
  attendance_percentage: number;
}

// Request/Response Types for API calls
export interface CreateAttendanceSessionRequest {
  group_id: string;
  session_name: string;
  session_type: SessionType;
  qr_duration_minutes?: number;
  faculty_latitude?: number;
  faculty_longitude?: number;
  allowed_radius_meters?: number;
  allow_late_entry?: boolean;
}

export interface QRScanRequest {
  qr_code_token: string;
  student_latitude: number;
  student_longitude: number;
}

export interface ManualAttendanceRequest {
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  manual_reason?: string;
}

export interface AttendanceAnalytics {
  group_id: string;
  group_name: string;
  total_sessions: number;
  average_attendance_percentage: number;
  students_below_threshold: number;
  most_attended_session_type: SessionType;
  least_attended_session_type: SessionType;
  recent_trend: 'improving' | 'declining' | 'stable';
}

export interface FacultyAttendanceStats {
  overallAttendanceRate: number;
  totalSessions: number;
  totalStudents: number;
  classAttendanceStats: {
    groupId: string;
    groupName: string;
    subjectCode: string;
    averageAttendance: number;
    totalSessions: number;
    totalStudents: number;
  }[];
}
