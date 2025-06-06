import { supabase } from './supabase/auth';
import type { DriveLink } from '@/types';

// Get drive links for a student in a group
export const getStudentDriveLinks = async (studentId: string, groupId: string): Promise<DriveLink[]> => {
  try {
    // Use the hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    const { data, error } = await supabase
      .from('student_drive_links')
      .select('*')
      .eq('student_id', studentProfileId)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching drive links:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getStudentDriveLinks:', error);
    return [];
  }
};

// Add a drive link for a student in a group
export const addStudentDriveLink = async (
  studentId: string, // Note: This is user.id, not student_profile.id
  groupId: string,
  url: string,
  description: string = 'No description'
): Promise<DriveLink | null> => {
  try {
    // Use the hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    // First check if the student already has 5 drive links
    const { data: existingLinks, error: countError } = await supabase
      .from('student_drive_links')
      .select('id', { count: 'exact' })
      .eq('student_id', studentProfileId)
      .eq('group_id', groupId);
    
    if (countError) {
      console.error('Error checking existing links:', countError);
      return null;
    }
    
    if (existingLinks && existingLinks.length >= 5) {
      console.error("Maximum of 5 drive links allowed per group");
      // Potentially, you might want to throw an error or return a specific message object
      return null;
    }
    
    // Insert the drive link and select the newly created record
    const { data: newLink, error } = await supabase
      .from('student_drive_links')
      .insert({
        student_id: studentProfileId, // Using hardcoded studentProfileId as per original code
        group_id: groupId,
        url,
        description,
        // created_at and updated_at are usually handled by database defaults/triggers
        // If not, keeping them is fine: 
        // created_at: new Date().toISOString(),
        // updated_at: new Date().toISOString()
      })
      .select()
      .single(); // .single() expects one row and returns it, or null/error
      
    if (error) {
      console.error('Error inserting drive link:', error);
      return null;
    }
    
    return newLink as DriveLink; // newLink should conform to DriveLink type
  } catch (error) {
    console.error('Error in addStudentDriveLink:', error);
    return null;
  }
};

// Update a drive link
export const updateStudentDriveLink = async (
  linkId: string,
  updates: { url?: string; description?: string }
): Promise<boolean> => {
  try {
    // Use the hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    const { error } = await supabase
      .from('student_drive_links')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .eq('student_id', studentProfileId);
      
    if (error) {
      console.error('Error updating drive link:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateStudentDriveLink:', error);
    return false;
  }
};

// Remove a drive link
export const removeStudentDriveLink = async (linkId: string): Promise<boolean> => {
  try {
    // Use the hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    const { error } = await supabase
      .from('student_drive_links')
      .delete()
      .eq('id', linkId)
      .eq('student_id', studentProfileId);
      
    if (error) {
      console.error('Error removing drive link:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeStudentDriveLink:', error);
    return false;
  }
};

// Get all drive links for a group (faculty view)
export const getGroupDriveLinks = async (groupId: string): Promise<DriveLink[]> => {
  try {
    const { data, error } = await supabase
      .from('student_drive_links')
      .select(`
        *,
        student:student_id (
          id,
          name,
          usn,
          email
        )
      `)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching group drive links:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getGroupDriveLinks:', error);
    return [];
  }
};
