-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'superadmin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  usn TEXT,
  class TEXT,
  semester TEXT,
  group_usn TEXT,
  subject_codes TEXT[] DEFAULT '{}'
);

-- Create faculty_profiles table
CREATE TABLE IF NOT EXISTS faculty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  faculty_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  pcl_group_no TEXT NOT NULL,
  description TEXT,
  drive_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, student_id)
);

-- Create student_drive_links table
CREATE TABLE IF NOT EXISTS student_drive_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewed')) DEFAULT 'pending',
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_profiles_updated_at
    BEFORE UPDATE ON faculty_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_drive_links_updated_at
    BEFORE UPDATE ON student_drive_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing auth user trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Row-Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_drive_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Faculty can view their own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Faculty can update their own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Faculty can view their own groups" ON groups;
DROP POLICY IF EXISTS "Faculty can insert groups" ON groups;
DROP POLICY IF EXISTS "Faculty can update their groups" ON groups;
DROP POLICY IF EXISTS "Faculty can delete their groups" ON groups;
DROP POLICY IF EXISTS "Faculty can view their group members" ON group_members;
DROP POLICY IF EXISTS "Students can view their group memberships" ON group_members;
DROP POLICY IF EXISTS "Faculty can insert group members" ON group_members;
DROP POLICY IF EXISTS "Faculty can view drive links for their group members" ON student_drive_links;
DROP POLICY IF EXISTS "Students can view their drive links" ON student_drive_links;
DROP POLICY IF EXISTS "Students can insert drive links" ON student_drive_links;
DROP POLICY IF EXISTS "Students can update their drive links" ON student_drive_links;
DROP POLICY IF EXISTS "Faculty can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view group assignments" ON assignments;
DROP POLICY IF EXISTS "Faculty can insert assignments" ON assignments;
DROP POLICY IF EXISTS "Faculty can update their assignments" ON assignments;
DROP POLICY IF EXISTS "Faculty can view submissions for their assignments" ON submissions;
DROP POLICY IF EXISTS "Students can view their submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert their submissions" ON submissions;
DROP POLICY IF EXISTS "Faculty can update submissions for their assignments" ON submissions;

-- Create RLS policies
-- Profiles: All authenticated users can view any profile
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Student Profiles: Students can view their own profile
CREATE POLICY "Students can view their own profile" ON student_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Student Profiles: Students can update their own profile
CREATE POLICY "Students can update their own profile" ON student_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Faculty Profiles: Faculty can view their own profile
CREATE POLICY "Faculty can view their own profile" ON faculty_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Faculty Profiles: Faculty can update their own profile
CREATE POLICY "Faculty can update their own profile" ON faculty_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Groups: Faculty can view their own groups
CREATE POLICY "Faculty can view their own groups" ON groups
  FOR SELECT
  USING (faculty_id = auth.uid());

-- Groups: Faculty can insert groups
CREATE POLICY "Faculty can insert groups" ON groups
  FOR INSERT
  WITH CHECK (faculty_id = auth.uid());

-- Groups: Faculty can update their own groups
CREATE POLICY "Faculty can update their groups" ON groups
  FOR UPDATE
  USING (faculty_id = auth.uid());

-- Groups: Faculty can delete their own groups
CREATE POLICY "Faculty can delete their groups" ON groups
  FOR DELETE
  USING (faculty_id = auth.uid());

-- Group Members: Faculty can view their group members
CREATE POLICY "Faculty can view their group members" ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_id 
      AND groups.faculty_id = auth.uid()
    )
  );

-- Group Members: Students can view their own group memberships
CREATE POLICY "Students can view their group memberships" ON group_members
  FOR SELECT
  USING (student_id = auth.uid());

-- Group Members: Faculty can insert group members for their groups
CREATE POLICY "Faculty can insert group members" ON group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_id 
      AND groups.faculty_id = auth.uid()
    )
  );

-- Student Drive Links: Faculty can view drive links for their group members
CREATE POLICY "Faculty can view drive links for their group members" ON student_drive_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      JOIN groups ON groups.id = group_members.group_id
      WHERE group_members.student_id = student_id
      AND groups.faculty_id = auth.uid()
    )
  );

-- Student Drive Links: Students can view their own drive links
CREATE POLICY "Students can view their drive links" ON student_drive_links
  FOR SELECT
  USING (student_id = auth.uid());

-- Student Drive Links: Students can insert drive links
CREATE POLICY "Students can insert drive links" ON student_drive_links
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = student_drive_links.group_id
      AND group_members.student_id = auth.uid()
    )
  );

-- Student Drive Links: Students can update their own drive links
CREATE POLICY "Students can update their drive links" ON student_drive_links
  FOR UPDATE
  USING (student_id = auth.uid());

-- Assignments: Faculty can view their own assignments
CREATE POLICY "Faculty can view their own assignments" ON assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_id 
      AND groups.faculty_id = auth.uid()
    )
  );

-- Assignments: Students can view assignments for their groups
CREATE POLICY "Students can view group assignments" ON assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = assignments.group_id
      AND group_members.student_id = auth.uid()
    )
  );

-- Assignments: Faculty can insert assignments for their groups
CREATE POLICY "Faculty can insert assignments" ON assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_id 
      AND groups.faculty_id = auth.uid()
    )
  );

-- Assignments: Faculty can update their own assignments
CREATE POLICY "Faculty can update their assignments" ON assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_id 
      AND groups.faculty_id = auth.uid()
    )
  );

-- Submissions: Faculty can view submissions for their assignments
CREATE POLICY "Faculty can view submissions for their assignments" ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments 
      JOIN groups ON groups.id = assignments.group_id
      WHERE assignments.id = assignment_id
      AND groups.faculty_id = auth.uid()
    )
  );

-- Submissions: Students can view their own submissions
CREATE POLICY "Students can view their submissions" ON submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Submissions: Students can insert their own submissions
CREATE POLICY "Students can insert their submissions" ON submissions
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM assignments
      JOIN group_members ON group_members.group_id = assignments.group_id
      WHERE assignments.id = submissions.assignment_id
      AND group_members.student_id = auth.uid()
    )
  );

-- Submissions: Faculty can update submissions intraocular their assignments
CREATE POLICY "Faculty can update submissions for their assignments" ON submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments 
      JOIN groups ON groups.id = assignments.group_id
      WHERE assignments.id = assignment_id
      AND groups.faculty_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_faculty_profiles_user_id ON faculty_profiles(user_id);
CREATE INDEX idx_groups_faculty_id ON groups(faculty_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_student_id ON group_members(student_id);
CREATE INDEX idx_student_drive_links_student_id ON student_drive_links(student_id);
CREATE INDEX idx_student_drive_links_group_id ON student_drive_links(group_id);
CREATE INDEX idx_assignments_group_id ON assignments(group_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

-- Create superadmin user (Note: Adjust password and auth system as needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@jainuniversity.ac.in') THEN
    INSERT INTO auth.users (
      id,
      email,
      email_confirmed_at,
      raw_user_meta_data
    )
    VALUES (
      gen_random_uuid(),
      'superadmin@jainuniversity.ac.in',
      CURRENT_TIMESTAMP,
      '{"role":"superadmin"}'
    );
  END IF;
END $$;