import { supabase } from '../supabase';
import { StudentProfile } from '@/types';

/**
 * Search for students by USN or email
 * @param searchTerm The search term (USN or email)
 * @returns Array of student profiles matching the search term
 */
export const searchStudents = async (searchTerm: string) => {
  if (!searchTerm.trim()) return [];
  
  // Search in profiles table where role = 'student'
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      student_profiles!inner(*)
    `)
    .eq('role', 'student')
    .or(`usn.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  
  if (error) {
    console.error('Error searching for students:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Get a student profile by ID
 * @param id The student's user ID
 * @returns The student profile
 */
export const getStudentById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      student_profiles!inner(*)
    `)
    .eq('id', id)
    .eq('role', 'student')
    .single();
  
  if (error) {
    console.error('Error getting student profile:', error);
    throw error;
  }
  
  return data;
};

/**
 * Get all students
 * @returns Array of all student profiles
 */
export const getAllStudents = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      student_profiles!inner(*)
    `)
    .eq('role', 'student');
  
  if (error) {
    console.error('Error getting all students:', error);
    throw error;
  }
  
  return data || [];
};
