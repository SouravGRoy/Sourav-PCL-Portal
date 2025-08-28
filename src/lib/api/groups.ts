import { supabase } from '../supabase';
import { Group, GroupMember, DriveLink, Profile, StudentProfile } from '@/types';

export const createGroup = async (group: Partial<Group>) => {
  try {
    if (!group.name || !group.faculty_id || !group.department) {
      throw new Error('Missing required fields for group creation');
    }

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: group.name,
        faculty_id: group.faculty_id,
        department: group.department,
        pcl_group_no: group.pcl_group_no || null,
        subject: group.subject || null,
        subject_code: group.subject_code || null,
        semester: group.semester || null,
        year: group.year || null,
        description: group.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      throw new Error(`Failed to create group: ${error.message}`, { cause: error });
    }

    // Create default attendance settings for the new group
    if (data && data.id) {
      try {
        const { error: settingsError } = await supabase
          .from('class_attendance_settings')
          .insert({
            group_id: data.id,
            faculty_id: group.faculty_id,
            minimum_attendance_percentage: 75.00,
            enable_low_attendance_notifications: true,
            notification_threshold_percentage: 70.00,
            notification_frequency_days: 7,
            default_session_duration_minutes: 60,
            default_qr_duration_minutes: 5,
            default_allowed_radius_meters: 20,
            allow_late_entry_by_default: true,
            default_late_entry_hours: 24
          });

        if (settingsError) {
          console.warn('Warning: Could not create default attendance settings for group:', settingsError);
          // Don't throw error here - the group was created successfully
        } else {
          console.log('Default attendance settings created for group:', data.id);
        }
      } catch (settingsError) {
        console.warn('Warning: Exception while creating attendance settings:', settingsError);
        // Don't throw error here - the group was created successfully
      }
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in createGroup:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createGroup', { cause: error });
  }
};

export const getGroupById = async (id: string): Promise<Group | null> => {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (groupError) {
      console.error('Error fetching group:', groupError);
      if (groupError.code === 'PGRST116') { // PostgREST error for ' esattamente una riga attesa, ma ne sono state trovate 0'
        return null; // Group not found
      }
      throw new Error(`Failed to fetch group: ${groupError.message}`, { cause: groupError });
    }

    if (!groupData) {
      return null; // Group not found
    }

    let facultyName = 'Unknown Faculty';
    if (groupData.faculty_id) {
      // Use the same logic as getFacultyProfile - first try faculty_profiles, then fall back to profiles
      const { data: facultyProfiles, error: facultyError } = await supabase
        .from('faculty_profiles')
        .select('name')
        .eq('user_id', groupData.faculty_id);
      
      if (facultyError) {
        console.warn(`Error fetching faculty profiles for user ${groupData.faculty_id}:`, facultyError.message);
      } else if (facultyProfiles && facultyProfiles.length > 0) {
        // If multiple profiles, use the most recent one
        if (facultyProfiles.length > 1) {
          console.warn(`Found ${facultyProfiles.length} faculty profiles for user ${groupData.faculty_id}. Using the first one.`);
        }
        facultyName = facultyProfiles[0].name || 'Faculty Member';
      } else {
        // Fallback to base profile
        console.warn(`No faculty profile found for user ${groupData.faculty_id}. Checking base profile.`);
        const { data: baseProfile, error: baseProfileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', groupData.faculty_id)
          .maybeSingle();
          
        if (baseProfileError) {
          console.warn(`Error fetching base profile for faculty ${groupData.faculty_id}:`, baseProfileError.message);
          facultyName = 'Faculty Member';
        } else if (baseProfile) {
          // Use the same fallback logic as getFacultyProfile
          facultyName = baseProfile.name || baseProfile.email?.split('@')[0] || 'Faculty Member';
        } else {
          facultyName = 'Faculty Member';
        }
      }
    }

    return {
      ...groupData,
      faculty_name: facultyName,
    } as Group;

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

// Enhanced function to get groups with member counts and assignment counts
export const getGroupsWithDetailsbyFaculty = async (facultyId: string): Promise<Group[]> => {
  try {
    if (!facultyId) {
      console.error('getGroupsWithDetailsbyFaculty called with invalid facultyId:', facultyId);
      return [];
    }
    
    console.log('Fetching detailed groups for faculty ID:', facultyId);
    
    // Get groups with member counts
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select(`
        *,
        member_count:group_members(count)
      `)
      .eq('faculty_id', facultyId);
    
    if (groupsError) {
      console.error('Error fetching groups with details:', groupsError);
      throw new Error(`Failed to fetch groups: ${groupsError.message}`, { cause: groupsError });
    }

    // Get assignment counts for each group
    const groupsWithCounts = await Promise.all(
      (groupsData || []).map(async (group: any) => {
        try {
          // Get assignment count
          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: Array.isArray(group.member_count) ? group.member_count.length : 0,
            assignment_count: assignmentCount || 0,
          };
        } catch (error) {
          console.error(`Error getting counts for group ${group.id}:`, error);
          return {
            ...group,
            member_count: 0,
            assignment_count: 0,
          };
        }
      })
    );
    
    console.log('Enhanced groups fetched successfully:', groupsWithCounts.length);
    return groupsWithCounts;
  } catch (error) {
    console.error('Unexpected error in getGroupsWithDetailsbyFaculty:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getGroupsWithDetailsbyFaculty', { cause: error });
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
 * Get all members of a specific group with their student profile details
 * @param groupId ID of the group to get members for
 */
export const getGroupMembers = async (groupId: string) => {
  try {
    if (!groupId) {
      console.error('getGroupMembers called with invalid groupId:', groupId);
      return [];
    }
    
    console.log('Fetching group members for group ID:', groupId);
    
    // Simplified approach: Get group members with their profiles in one query
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select(`
        id,
        student_id,
        joined_at,
        status,
        profiles!inner (
          id,
          email,
          student_profiles (
            id,
            name,
            usn,
            class,
            semester,
            group_usn,
            subject_codes
          )
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'active');
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      throw new Error(`Failed to fetch group members: ${membersError.message}`);
    }

    if (!membersData || membersData.length === 0) {
      console.log('No members found for group:', groupId);
      return [];
    }
    
    console.log(`Found ${membersData.length} members for group:`, groupId);
    
    // Transform the data to match the expected GroupMember interface
    const result: GroupMember[] = membersData.map((member: any) => {
      const profile = member.profiles;
      const studentProfile = profile?.student_profiles?.[0];
      
      return {
        id: member.id,
        group_id: groupId,
        student_id: member.student_id,
        joined_at: member.joined_at,
        status: member.status,
        email: profile?.email || '',
        name: studentProfile?.name || 'Unknown',
        usn: studentProfile?.usn || '',
        class: studentProfile?.class || '',
        semester: studentProfile?.semester || '',
        group_usn: studentProfile?.group_usn || '',
        subject_codes: studentProfile?.subject_codes || [],
        student: {
          id: studentProfile?.id || '',
          name: studentProfile?.name || 'Unknown',
          usn: studentProfile?.usn || '',
          group_usn: studentProfile?.group_usn || '', // Added missing group_usn
          class: studentProfile?.class || '',
          semester: studentProfile?.semester || '',
          email: profile?.email || '' // Added missing email
        },
        driveLinks: [] // We'll fetch these separately if needed
      };
    });

    return result;
  } catch (error) {
    console.error('Unexpected error in getGroupMembers:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getGroupMembers', { cause: error });
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
