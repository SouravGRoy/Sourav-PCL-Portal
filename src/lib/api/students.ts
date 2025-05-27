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
export const updateStudentProfile = async (userId: string, updates: Partial<StudentProfile>) => {
  try {
    // Update base profile in profiles table
    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
      })
      .eq('id', userId)
      .eq('role', 'student')
      .select()
      .single();

    if (baseError) throw baseError;

    // Update student-specific profile in student_profiles table
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .update({
        usn: updates.usn,
        class: updates.class,
        semester: updates.semester,
        group_usn: updates.group_usn,
        subject_codes: updates.subject_codes,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (studentError) throw studentError;

    return { ...baseProfile, ...studentData } as StudentProfile;
  } catch (error) {
    console.error('Error updating student profile:', error);
    throw error;
  }
};

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

// Old implementation removed

/**
 * Get all students
 * @returns Array of all student profiles
 */
export const getAllStudents = async (): Promise<Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  usn: string;
  class: string;
  semester: string;
  group_usn: string;
}>> => {
  try {
    console.log('Fetching all students');
    
    // Get all profiles with role=student
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
      
    if (profilesError) {
      console.error('Error fetching all profiles:', profilesError);
      return [];
    }
    
    console.log(`Found ${allProfiles?.length || 0} student profiles`);
    
    // Get all student profiles
    const { data: allStudentProfiles, error: studentProfilesError } = await supabase
      .from('student_profiles')
      .select('*');
      
    if (studentProfilesError) {
      console.error('Error fetching all student profiles:', studentProfilesError);
      // Continue with just the profiles
    }
    
    // Create a map of student profiles for easier lookup
    const studentProfilesMap: Record<string, any> = {};
    if (allStudentProfiles) {
      allStudentProfiles.forEach(profile => {
        if (profile.user_id) {
          studentProfilesMap[profile.user_id] = profile;
        }
      });
    }
    
    // Map the profiles to include student profile information
    const result = allProfiles?.map(profile => {
      const studentProfile = studentProfilesMap[profile.id] || {};
      
      return {
        id: profile.id,
        // Use student_profiles.name if available, otherwise use email from profiles
        name: studentProfile.name || profile.email || '',
        email: profile.email || '',
        role: profile.role || 'student',
        usn: studentProfile.usn || '',
        class: studentProfile.class || '',
        semester: studentProfile.semester || '',
        group_usn: studentProfile.group_usn || ''
      };
    }).filter(item => item.id) || [];
    
    console.log(`Returning ${result.length} students`);
    return result;
  } catch (error) {
    console.error('Unexpected error in getAllStudents:', error);
    return [];
  }
};

/**
 * Search students by USN or email
 * @param searchTerm The USN or email to search for
 * @returns Array of student profiles matching the search term
 */
export const searchStudentsByUSN = async (searchTerm: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  usn: string;
  class: string;
  semester: string;
  group_usn: string;
}>> => {
  try {
    // If no search term is provided, return all students
    if (!searchTerm.trim()) {
      return getAllStudents();
    }
    
    console.log('Searching for students with term:', searchTerm);
    
    // Direct approach: Search in profiles table by email
    const { data: emailMatches, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .ilike('email', `%${searchTerm}%`);
      
    if (emailError) {
      console.error('Error searching by email:', emailError);
    } else {
      console.log(`Found ${emailMatches?.length || 0} profiles matching email search`);
    }
    
    // Get all student profiles (we'll filter by USN in memory)
    const { data: allStudentProfiles, error: profilesError } = await supabase
      .from('student_profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error fetching all student profiles:', profilesError);
      // If we have email matches, we can still continue
      if (!emailMatches || emailMatches.length === 0) {
        return [];
      }
    }
    
    // Filter student profiles by USN
    const usnMatches = allStudentProfiles ? 
      allStudentProfiles.filter(profile => 
        profile.usn && profile.usn.toLowerCase().includes(searchTerm.toLowerCase())
      ) : [];
    
    console.log(`Found ${usnMatches.length} profiles matching USN search`);
    
    // Get all profiles to match with student profiles
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
      
    if (allProfilesError) {
      console.error('Error fetching all profiles:', allProfilesError);
    }
    
    // Create maps for easier lookups
    const profilesMap: Record<string, any> = {};
    const studentProfilesMap: Record<string, any> = {};
    
    if (allProfiles) {
      allProfiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
    
    if (allStudentProfiles) {
      allStudentProfiles.forEach(profile => {
        if (profile.user_id) {
          studentProfilesMap[profile.user_id] = profile;
        }
      });
    }
    
    // Combine results from both searches
    const combinedResults = new Map();
    
    // Add email matches
    if (emailMatches) {
      emailMatches.forEach(profile => {
        const studentProfile = studentProfilesMap[profile.id] || {};
        combinedResults.set(profile.id, {
          id: profile.id,
          name: profile.name || '',
          email: profile.email || '',
          role: profile.role || 'student',
          usn: studentProfile.usn || '',
          class: studentProfile.class || '',
          semester: studentProfile.semester || '',
          group_usn: studentProfile.group_usn || ''
        });
      });
    }
    
    // Add USN matches
    usnMatches.forEach(studentProfile => {
      if (studentProfile.user_id) {
        const profile = profilesMap[studentProfile.user_id] || {};
        combinedResults.set(studentProfile.user_id, {
          id: studentProfile.user_id,
          name: profile.name || '',
          email: profile.email || '',
          role: profile.role || 'student',
          usn: studentProfile.usn || '',
          class: studentProfile.class || '',
          semester: studentProfile.semester || '',
          group_usn: studentProfile.group_usn || ''
        });
      }
    });
    
    const result = Array.from(combinedResults.values());
    console.log(`Returning ${result.length} combined student results`);
    return result;
  } catch (error) {
    console.error('Unexpected error in searchStudentsByUSN:', error);
    return [];
  }
};
