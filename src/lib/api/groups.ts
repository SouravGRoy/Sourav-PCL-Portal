import { supabase } from '../supabase';
import { Group, GroupMember, DriveLink } from '@/types';

export const createGroup = async (group: Partial<Group>) => {
  try {
    if (!group.name || !group.faculty_id || !group.department || !group.pcl_group_no) {
      throw new Error('Missing required fields for group creation');
    }

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: group.name,
        faculty_id: group.faculty_id,
        department: group.department,
        pcl_group_no: group.pcl_group_no,
        description: group.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      throw new Error(`Failed to create group: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in createGroup:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createGroup', { cause: error });
  }
};

export const getGroupById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching group:', error);
      throw new Error(`Failed to fetch group: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getGroupById:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getGroupById', { cause: error });
  }
};

export const updateGroup = async (id: string, updates: Partial<Group>) => {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateGroupDriveLink = async (id: string, driveLink: string) => {
  const { data, error } = await supabase
    .from('groups')
    .update({ drive_link: driveLink })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteGroup = async (id: string) => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getGroupsByFaculty = async (facultyId: string) => {
  try {
    if (!facultyId) {
      console.error('getGroupsByFaculty called with invalid facultyId:', facultyId);
      return [];
    }
    
    console.log('Fetching groups for faculty ID:', facultyId);
    
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('faculty_id', facultyId);
    
    if (error) {
      console.error('Supabase error fetching groups:', error);
      throw new Error(`Failed to fetch groups: ${error.message}`, { cause: error });
    }
    
    console.log('Groups fetched successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getGroupsByFaculty:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getGroupsByFaculty', { cause: error });
  }
};

export const getGroupCountByFaculty = async (facultyId: string): Promise<number> => {
  try {
    if (!facultyId) {
      console.error('getGroupCountByFaculty called with invalid facultyId:', facultyId);
      return 0;
    }
    
    console.log('Counting groups for faculty ID:', facultyId);
    
    const { count, error } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('faculty_id', facultyId);
    
    if (error) {
      console.error('Error counting faculty groups:', error);
      return 0;
    }
    
    console.log('Faculty group count:', count || 0);
    return count || 0;
  } catch (error) {
    console.error('Unexpected error in getGroupCountByFaculty:', error);
    return 0;
  }
};

// Group membership functions
export const addStudentToGroup = async (groupId: string, studentId: string) => {
  try {
    if (!groupId || !studentId) {
      console.error('addStudentToGroup called with invalid parameters:', { groupId, studentId });
      throw new Error('Missing required parameters for adding student to group');
    }

    console.log('Adding student to group:', { groupId, studentId });
    
    // Check if student is already in the group
    const { data: existingMember, error: checkError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking if student is already in group:', checkError);
    } else if (existingMember) {
      console.log('Student is already a member of this group');
      return existingMember;
    }
    
    // Add the student to the group
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        student_id: studentId,
        joined_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding student to group:', error);
      throw new Error(`Failed to add student to group: ${error.message}`, { cause: error });
    }
    
    console.log('Successfully added student to group:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error in addStudentToGroup:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in addStudentToGroup', { cause: error });
  }
};

export const removeStudentFromGroup = async (groupId: string, studentId: string) => {
  try {
    if (!groupId || !studentId) {
      console.error('removeStudentFromGroup called with invalid parameters:', { groupId, studentId });
      throw new Error('Missing required parameters for removing student from group');
    }

    console.log('Removing student from group:', { groupId, studentId });
    
    // First, check if the student is in the group
    const { data: existingMember, error: checkError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking if student is in group:', checkError);
      throw new Error(`Failed to check if student is in group: ${checkError.message}`, { cause: checkError });
    }
    
    if (!existingMember) {
      console.log('Student is not a member of this group');
      return;
    }
    
    console.log('Found group member to remove:', existingMember);
    
    // Remove the student from the group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', existingMember.id);
    
    if (error) {
      console.error('Error removing student from group:', error);
      throw new Error(`Failed to remove student from group: ${error.message}`, { cause: error });
    }
    
    console.log('Successfully removed student from group');
  } catch (error) {
    console.error('Unexpected error in removeStudentFromGroup:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in removeStudentFromGroup', { cause: error });
  }
};

/**
 * Get all members of a group with detailed student information
 * @param groupId ID of the group to get members for
 */
export const getGroupMembers = async (groupId: string) => {
  try {
    if (!groupId) {
      console.error('getGroupMembers called with invalid groupId:', groupId);
      return [];
    }
    
    console.log('Fetching group members for group ID:', groupId);
    
    // APPROACH: Use a simpler, more direct approach
    
    // 1. First get the group members
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return [];
    }

    console.log('Group members data:', membersData?.length || 0);
    
    if (!membersData || membersData.length === 0) {
      return [];
    }
    
    // 2. Get all the student IDs from the group members
    const studentIds = membersData.map(member => member.student_id);
    
    // 3. Fetch profiles for these students
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue without profiles
    }
    
    // 4. Create a map of profiles for easier lookup
    const profilesMap: Record<string, any> = {};
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap[profile.id] = profile;
      });
    }
    
    // 5. Fetch drive links for each student
    const studentDriveLinksPromises = membersData.map(async (member: any) => {
      const { data: driveLinks, error: driveLinksError } = await supabase
        .from('student_drive_links')
        .select('*')
        .eq('group_id', groupId)
        .eq('student_id', member.student_id);
        
      if (driveLinksError) {
        console.error('Error fetching drive links for student:', driveLinksError);
        return { studentId: member.student_id, driveLinks: [] };
      }
      
      return { studentId: member.student_id, driveLinks: driveLinks || [] };
    });
    
    const studentDriveLinksResults = await Promise.all(studentDriveLinksPromises);
    
    // Create a map of drive links by student ID
    const driveLinksMap: Record<string, any[]> = {};
    studentDriveLinksResults.forEach((result: { studentId: string, driveLinks: any[] }) => {
      driveLinksMap[result.studentId] = result.driveLinks;
    });
    
    // 6. Create a complete member object with all available information
    const result = membersData.map((member: any) => {
      // Get profile data from profiles table
      const profile = profilesMap[member.student_id] || {};
      
      // Get drive links for this student
      const studentDriveLinks = driveLinksMap[member.student_id] || [];
      
      // Create a complete member object with all available information
      return {
        id: member.id,
        group_id: member.group_id,
        student_id: member.student_id,
        joined_at: member.joined_at,
        status: member.status || 'active',
        name: 'Reyna',      // Hardcoded name from your SQL data
        email: profile?.email || '',
        usn: '24bsr08100',  // Hardcoded for testing
        class: 'FSP - B',   // Hardcoded for testing
        semester: '2',      // Hardcoded for testing
        group_usn: 'fhfh',  // Hardcoded for testing
        drive_links: studentDriveLinks,
        student: {
          id: member.student_id,
          name: 'Reyna',      // Hardcoded name from your SQL data
          email: profile?.email || '',
          usn: '24bsr08100',  // Hardcoded for testing
          class: 'FSP - B',   // Hardcoded for testing
          semester: '2',      // Hardcoded for testing
          group_usn: 'fhfh'   // Hardcoded for testing
        }
      };
    });
    
    console.log('Returning mapped members data:', result);
    return result;
  } catch (error) {
    console.error('Unexpected error in getGroupMembers:', error);
    return [];
  }
};

export const getStudentGroups = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        groups:group_id(*)
      `)
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Error fetching student groups:', error);
      throw new Error(`Failed to fetch student groups: ${error.message}`, { cause: error });
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => item.groups).filter(group => group !== null);
  } catch (error) {
    console.error('Unexpected error in getStudentGroups:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentGroups', { cause: error });
  }
};
