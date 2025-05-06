export type UserRole = 'superadmin' | 'faculty' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export interface StudentProfile extends UserProfile {
  usn: string;
  group_usn: string;
  class: string;
  semester: string;
  subject_codes: string[];
}

export interface FacultyProfile extends UserProfile {
  department: string;
}

export interface Group {
  id: string;
  name: string;
  faculty_id: string;
  department: string;
  pcl_group_no: string;
  description?: string;
  created_at: string;
  faculty_name?: string; // Added for UI display purposes
}

export interface StudentDriveLink {
  id: string;
  url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
  drive_links?: StudentDriveLink[];
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  group_id: string;
  due_date: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  url: string;
  submitted_at: string;
  status: 'pending' | 'reviewed';
  feedback?: string;
}
