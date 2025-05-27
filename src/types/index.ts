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
  drive_link?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  faculty_name?: string; // Added for UI display purposes
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
