import { supabase } from '../supabase';
import { UserProfile, StudentProfile, FacultyProfile } from '@/types';

export const createProfile = async (profile: Partial<UserProfile>) => {
  try {
    // Check if we have a valid user ID
    if (!profile.id) {
      throw new Error('User ID is required for profile creation');
    }
    
    // We can't use admin functions in client-side code, so we'll skip the auth check
    // and rely on the database foreign key constraint

    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('Error checking for existing profile:', fetchError);
    }

    if (existingProfile) {
      console.log('Updating existing profile for user:', profile.id);
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
      return data;
    } else {
      console.log('Creating new profile for user:', profile.id);
      // Insert new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert(profile)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting profile:', error);
        throw error;
      }
      return data;
    }
  } catch (error) {
    console.error('Unexpected error in createProfile:', error);
    throw error;
  }
};

export const getProfileById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const createStudentProfile = async (profile: Partial<StudentProfile>) => {
  // First create the base profile
  const baseProfile = await createProfile({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: 'student',
    created_at: profile.created_at,
  });
  
  // Then create the student-specific profile
  const { data, error } = await supabase
    .from('student_profiles')
    .insert({
      user_id: baseProfile.id,
      usn: profile.usn,
      class: profile.class,
      semester: profile.semester,
      subject_codes: profile.subject_codes,
    })
    .select()
    .single();
  
  if (error) throw error;
  return { ...baseProfile, ...data };
};

export const createFacultyProfile = async (profile: Partial<FacultyProfile>) => {
  // First create the base profile
  const baseProfile = await createProfile({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: 'faculty',
    created_at: profile.created_at,
  });
  
  // Then create the faculty-specific profile
  const { data, error } = await supabase
    .from('faculty_profiles')
    .insert({
      user_id: baseProfile.id,
      department: profile.department,
    })
    .select()
    .single();
  
  if (error) throw error;
  return { ...baseProfile, ...data };
};

export const getStudentProfile = async (userId: string) => {
  const baseProfile = await getProfileById(userId);
  
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return { ...baseProfile, ...data } as StudentProfile;
};

export const getFacultyProfile = async (userId: string) => {
  const baseProfile = await getProfileById(userId);
  
  const { data, error } = await supabase
    .from('faculty_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return { ...baseProfile, ...data } as FacultyProfile;
};

export const getAllFaculty = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'faculty');
  
  if (error) throw error;
  return data as FacultyProfile[];
};

export const getAllStudents = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');
  
  if (error) throw error;
  return data as StudentProfile[];
};
