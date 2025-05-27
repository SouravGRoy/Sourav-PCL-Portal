import { createClient } from '@supabase/supabase-js';
import { Profile, StudentProfile, FacultyProfile } from '@/types';

// Make sure we have the required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create the Supabase client with persistent sessions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Session validation functions
export const validateSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session validation error:', error);
      return { valid: false, error, session: null };
    }
    return { valid: !!data.session, session: data.session, error: null };
  } catch (error: any) {
    console.error('Unexpected error during session validation:', error);
    return { valid: false, error, session: null };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get current user error:', error);
      return { user: null, error };
    }
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return { user: null, error };
  }
};

// Authentication Functions
export const signUp = async (email: string, password: string, role: 'student' | 'faculty' | 'superadmin') => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role
        }
      }
    });

    if (authError) throw authError;
    return authData;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Profile Functions
export const createProfile = async (userId: string | undefined, data: Partial<Profile>) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          ...data,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

export const getProfile = async (userId: string) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Student Profile Functions
export const createStudentProfile = async (userId: string, data: Partial<StudentProfile>) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('student_profiles')
      .insert([
        {
          id: userId,
          ...data,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error creating student profile:', error);
    throw error;
  }
};

// Faculty Profile Functions
export const createFacultyProfile = async (userId: string, data: Partial<FacultyProfile>) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('faculty_profiles')
      .insert([
        {
          id: userId,
          ...data,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error creating faculty profile:', error);
    throw error;
  }
};
