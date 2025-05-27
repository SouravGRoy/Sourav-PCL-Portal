import { supabase } from '../supabase';
import { Profile, StudentProfile, FacultyProfile } from '@/types';
import { PostgrestError } from '@supabase/supabase-js';

export const createProfile = async (profile: Partial<Profile>) => {
  try {
    if (!profile.id) {
      throw new Error('User ID is required for profile creation');
    }

    // Ensure all required fields are present
    const now = new Date().toISOString();
    const completeProfile = {
      ...profile,
      created_at: profile.created_at || now,
      updated_at: profile.updated_at || now,
      role: profile.role || 'faculty' // Default to faculty if not specified
    };

    console.log('Checking for existing profile with ID:', profile.id);
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing profile:', fetchError);
      throw new Error(`Failed to check existing profile: ${fetchError.message}`, { cause: fetchError });
    }

    if (existingProfile) {
      console.log('Updating existing profile for user:', profile.id);
      const updateData = {
        ...completeProfile,
        updated_at: now // Always update the updated_at timestamp
      };
      console.log('Update data:', updateData);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`, { cause: error });
      }
      console.log('Profile updated successfully:', data);
      return data;
    } else {
      console.log('Creating new profile for user:', profile.id);
      console.log('Insert data:', completeProfile);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(completeProfile)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting profile:', error);
        throw new Error(`Failed to insert profile: ${error.message}`, { cause: error });
      }
      console.log('Profile created successfully:', data);
      return data;
    }
  } catch (error) {
    console.error('Unexpected error in createProfile:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createProfile', { cause: error });
  }
};

export const getProfileById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching profile by ID:', error);
    throw new Error(`Failed to fetch profile: ${error.message}`, { cause: error });
  }
  return data;
};

export const updateProfile = async (id: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`, { cause: error });
  }
  return data;
};

export const createStudentProfile = async (profile: Partial<StudentProfile>) => {
  try {
    if (!profile.id) {
      throw new Error('User ID is required for student profile creation');
    }

    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .insert({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: 'student',
      })
      .select()
      .single();

    if (baseError) {
      console.error('Error creating base profile:', baseError);
      throw new Error(`Failed to create base profile: ${baseError.message}`, { cause: baseError });
    }

    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: profile.id,
        usn: profile.usn,
        class: profile.class,
        semester: profile.semester,
        subject_codes: profile.subject_codes || [],
        group_usn: profile.group_usn,
      })
      .select()
      .single();

    if (studentError) {
      console.error('Error creating student profile:', studentError);
      throw new Error(`Failed to create student profile: ${studentError.message}`, { cause: studentError });
    }

    return {
      ...baseProfile,
      ...studentData,
      created_at: baseProfile.created_at,
      updated_at: baseProfile.updated_at,
    } as StudentProfile;
  } catch (error) {
    console.error('Unexpected error in createStudentProfile:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createStudentProfile', { cause: error });
  }
};

export const createFacultyProfile = async (profile: Partial<FacultyProfile>) => {
  try {
    if (!profile.id) {
      throw new Error('User ID is required for faculty profile creation');
    }
    
    console.log('Creating faculty profile with data:', profile);
    
    // First, directly check if the profile exists in the profiles table
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .maybeSingle();
      
    console.log('Existing profile check result:', existingProfile, checkError);
    
    let baseProfile;
    
    // If profile exists, update it, otherwise insert it
    if (existingProfile) {
      console.log('Updating existing base profile');
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          role: 'faculty',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating base profile:', error);
        throw new Error(`Failed to update base profile: ${error.message}`, { cause: error });
      }
      
      baseProfile = data;
    } else {
      console.log('Creating new base profile');
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: 'faculty',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating base profile:', error);
        throw new Error(`Failed to create base profile: ${error.message}`, { cause: error });
      }
      
      baseProfile = data;
    }
    
    console.log('Base profile operation successful:', baseProfile);
    
    // Now check if faculty profile exists
    const { data: existingFacultyProfile, error: facultyCheckError } = await supabase
      .from('faculty_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
      
    console.log('Existing faculty profile check result:', existingFacultyProfile, facultyCheckError);
    
    let facultyData;
    
    // If faculty profile exists, update it, otherwise insert it
    if (existingFacultyProfile) {
      console.log('Updating existing faculty profile with name:', profile.name, 'and department:', profile.department);
      
      // Create the update payload and log it exactly as it will be sent to Supabase
      const updatePayload = {
        name: profile.name, // Include name field
        department: profile.department, // Don't use empty string fallback
        updated_at: new Date().toISOString()
      };
      
      console.log('EXACT UPDATE PAYLOAD:', JSON.stringify(updatePayload, null, 2));
      
      // Try a direct update using a more explicit approach
      const { data, error } = await supabase
        .from('faculty_profiles')
        .update(updatePayload)
        .eq('user_id', profile.id)
        .select()
        .single();
        
      // Log the complete response
      console.log('SUPABASE UPDATE RESPONSE:', JSON.stringify({ data, error }, null, 2));
        
      if (error) {
        console.error('Error updating faculty profile:', error);
        throw new Error(`Failed to update faculty profile: ${error.message}`, { cause: error });
      }
      
      facultyData = data;
    } else {
      console.log('Creating new faculty profile with name:', profile.name, 'and department:', profile.department);
      
      // Create the insert payload and log it exactly as it will be sent to Supabase
      const insertPayload = {
        user_id: profile.id,
        name: profile.name, // Include name field
        department: profile.department, // Don't use empty string fallback
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('EXACT INSERT PAYLOAD:', JSON.stringify(insertPayload, null, 2));
      
      // Let's try a direct insert using a more explicit approach
      const { data, error } = await supabase
        .from('faculty_profiles')
        .insert(insertPayload)
        .select()
        .single();
        
      // Log the complete response
      console.log('SUPABASE INSERT RESPONSE:', JSON.stringify({ data, error }, null, 2));
        
      if (error) {
        console.error('Error creating faculty profile:', error);
        throw new Error(`Failed to create faculty profile: ${error.message}`, { cause: error });
      }
      
      facultyData = data;
    }
    
    console.log('Faculty profile operation successful:', facultyData);
    
    // Return the combined profile
    return {
      ...baseProfile,
      ...facultyData,
      department: facultyData.department
    } as FacultyProfile;
  } catch (error) {
    console.error('Unexpected error in createFacultyProfile:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createFacultyProfile', { cause: error });
  }
};

export const getStudentProfile = async (userId: string): Promise<StudentProfile | null> => {
  try {
    // Get base profile
    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (baseError) {
      console.error('Base profile error:', {
        message: baseError.message,
        code: baseError.code,
        details: baseError.details,
      });
      throw new Error(`Base profile error: ${baseError.message}`, { cause: baseError });
    }

    if (!baseProfile) {
      console.log('No base profile found for user:', userId);
      return null;
    }

    // Check if student profile exists
    const { data: studentProfile, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError) {
      console.error('Student profile error:', {
        message: studentError.message,
        code: studentError.code,
        details: studentError.details,
      });
      throw new Error(`Student profile error: ${studentError.message}`, { cause: studentError });
    }

    // If student profile exists, return the combined profile
    if (studentProfile) {
      return {
        id: baseProfile.id,
        email: baseProfile.email,
        name: studentProfile.name || baseProfile.name || '', // Use name from student_profiles first
        role: baseProfile.role,
        user_id: studentProfile.user_id,
        usn: studentProfile.usn || '',
        class: studentProfile.class || '',
        semester: studentProfile.semester || '',
        subject_codes: studentProfile.subject_codes || [],
        group_usn: studentProfile.group_usn || '',
        created_at: baseProfile.created_at,
        updated_at: baseProfile.updated_at,
      } as StudentProfile;
    }
    
    // If we get here, student profile doesn't exist
    // Instead of trying to create one automatically (which is causing errors),
    // just return a temporary profile object without saving it to the database
    console.log('No student profile found for user:', userId);
    console.log('Returning temporary profile without creating in database');
    
    return {
      id: baseProfile.id,
      email: baseProfile.email,
      name: baseProfile.name || '',
      role: baseProfile.role,
      usn: '',
      class: '',
      semester: '',
      subject_codes: [],
      group_usn: '',
      created_at: baseProfile.created_at,
      updated_at: baseProfile.updated_at,
    } as StudentProfile;
  } catch (error) {
    console.error('Error fetching student profile:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentProfile', { cause: error });
  }
};

export const updateStudentProfile = async (
  userId: string,
  updates: Partial<StudentProfile>
): Promise<StudentProfile> => {
  try {
    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (baseError) {
      console.error('Error updating base profile:', baseError);
      throw new Error(`Failed to update base profile: ${baseError.message}`, { cause: baseError });
    }

    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .update({
        usn: updates.usn,
        class: updates.class,
        semester: updates.semester,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (studentError) {
      console.error('Error updating student profile:', studentError);
      throw new Error(`Failed to update student profile: ${studentError.message}`, { cause: studentError });
    }

    return {
      ...baseProfile,
      ...studentData,
      group_usn: studentData.group_usn || null,
      created_at: studentData.created_at,
      updated_at: studentData.updated_at,
    };
  } catch (error) {
    console.error('Unexpected error in updateStudentProfile:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in updateStudentProfile', { cause: error });
  }
};

export async function getFacultyProfile(userId: string): Promise<FacultyProfile | null> {
  try {
    console.log('Fetching faculty profile for user ID:', userId);
    
    // First, get the base profile
    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (baseError) {
      console.error('Error fetching base profile:', baseError);
      return null; // Don't throw, just return null to avoid breaking the UI
    }
    
    if (!baseProfile) {
      console.log('No base profile found for user:', userId);
      return null;
    }
    
    console.log('Base profile found:', baseProfile);
    
    // Check for duplicate faculty profiles and handle them properly
    // Use .eq instead of .single() to avoid the multiple rows error
    const { data: facultyProfiles, error: facultyError } = await supabase
      .from('faculty_profiles')
      .select('*')
      .eq('user_id', userId);
    
    // Handle error cases gracefully
    if (facultyError) {
      console.error('Error fetching faculty profiles:', facultyError);
      // Return a default profile instead of throwing an error
      return {
        ...baseProfile,
        name: baseProfile.email?.split('@')[0] || 'Faculty User',
        department: 'Department'
      } as FacultyProfile;
    }
    
    // If there are no faculty profiles, create one if the user is faculty
    if (!facultyProfiles || facultyProfiles.length === 0) {
      console.log('No faculty profile found for user. Checking role.');
      
      if (baseProfile.role === 'faculty') {
        console.log('Creating a new faculty profile for user with role faculty');
        
        try {
          // Create default faculty profile
          const { data: newProfile, error: createError } = await supabase
            .from('faculty_profiles')
            .insert({
              user_id: userId,
              name: baseProfile.email?.split('@')[0] || 'Faculty User',
              department: 'Department',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();
          
          if (createError) {
            console.error('Error creating faculty profile:', createError);
            return {
              ...baseProfile,
              name: baseProfile.email?.split('@')[0] || 'Faculty User',
              department: 'Department'
            } as FacultyProfile;
          }
          
          // Handle the case where newProfile might be an array
          const profileData = Array.isArray(newProfile) ? newProfile[0] : newProfile;
          
          if (profileData) {
            console.log('Created new faculty profile:', profileData);
            return {
              ...baseProfile,
              ...profileData
            };
          }
        } catch (createErr) {
          console.error('Exception during profile creation:', createErr);
        }
      }
      
      // If we get here, either the user is not faculty or profile creation failed
      console.log('User is not a faculty member or profile creation failed');
      return {
        ...baseProfile,
        name: baseProfile.email?.split('@')[0] || 'Faculty User',
        department: 'Department'
      } as FacultyProfile;
    }
    
    // If there are multiple profiles, use the most recent one
    if (facultyProfiles.length > 1) {
      console.log(`Found ${facultyProfiles.length} faculty profiles. Using the most recent one.`);
      
      // Sort by updated_at in descending order
      const sortedProfiles = [...facultyProfiles].sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      // Use the most recent profile
      const mostRecentProfile = sortedProfiles[0];
      console.log('Using most recent faculty profile:', mostRecentProfile);
      
      return {
        ...baseProfile,
        ...mostRecentProfile
      };
    }
    
    // Single profile case
    console.log('Single faculty profile found:', facultyProfiles[0]);
    return {
      ...baseProfile,
      ...facultyProfiles[0]
    };
  } catch (error) {
    // Catch any other unexpected errors
    console.error('Unexpected error in getFacultyProfile:', error);
    return null; // Return null instead of throwing to avoid breaking the UI
  }
}

export const getAllFaculty = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'faculty');
  
  if (error) {
    console.error('Error fetching all faculty:', error);
    throw new Error(`Failed to fetch faculty: ${error.message}`, { cause: error });
  }
  return data as FacultyProfile[];
};

export const getAllStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
    
    if (error) throw error;
    
    return data || [];
  } catch (error: unknown) {
    console.error('Error fetching all students:', error);
    throw new Error(`Failed to fetch students: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};

export const getStudentCount = async (): Promise<number> => {
  try {
    // Count the number of student profiles
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');
    
    if (error) {
      console.error('Error counting students:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Unexpected error in getStudentCount:', error);
    return 0;
  }
};