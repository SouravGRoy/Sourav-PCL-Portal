import { createClient } from '@supabase/supabase-js';
import { Group, StudentProfile, GroupMember, StudentDriveLink, Student } from '@/types';
import { validateSession, getCurrentUser } from './auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get faculty name from profile
const getFacultyName = async (facultyId?: string): Promise<string | null> => {
  if (!facultyId) {
    console.error('No faculty ID provided');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', facultyId)
      .single();

    if (error) throw error;
    return data?.name || null;
  } catch (error) {
    console.error('Error fetching faculty name:', error);
    return null;
  }
};

// Group Management Functions

// Get all groups a student is a member of
export const getGroupsByStudent = async (studentId: string) => {
  try {
    console.log('Fetching groups for student ID:', studentId);
    
    // First, get all group memberships for this student
    const { data: groupMembers, error: memberError } = await supabase
      .from('group_members')
      .select('group_id, student_id')
      .eq('student_id', studentId);

    if (memberError) {
      console.error('Error fetching group memberships:', memberError);
      throw memberError;
    }

    if (!groupMembers || groupMembers.length === 0) {
      console.log('No group memberships found for student');
      return [];
    }

    console.log('Found group memberships:', groupMembers);
    
    // Get the group IDs
    const groupIds = groupMembers.map(member => member.group_id);
    
    // Fetch the actual group details
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);
      
    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      throw groupsError;
    }
    
    if (!groups || groups.length === 0) {
      console.log('No groups found with the given IDs');
      return [];
    }
    
    console.log('Found groups:', groups);

    // Add faculty names to groups
    const groupsWithFaculty = await Promise.all(
      groups.map(async (group) => {
        const facultyName = group.faculty_id 
          ? await getFacultyName(group.faculty_id) 
          : 'Unknown Faculty';
        return {
          ...group,
          faculty_name: facultyName
        };
      })
    );

    return groupsWithFaculty;
  } catch (error) {
    console.error('Error fetching groups for student:', error);
    return [];
  }
};
export const createGroup = async (groupData: Omit<Group, 'id' | 'created_at'>) => {
  if (!groupData.faculty_id) {
    throw new Error('Faculty ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('groups')
      .insert([
        {
          ...groupData,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const getGroupsByFaculty = async (facultyId: string | undefined): Promise<Group[]> => {
  if (!facultyId) {
    console.error('No faculty ID provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Add faculty name to each group
    const groupsWithFaculty = await Promise.all(
      data.map(async (group) => ({
        ...group,
        faculty_name: await getFacultyName(group.faculty_id) || 'Unknown Faculty'
      }))
    );

    return groupsWithFaculty;
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
};

export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  if (!groupId) {
    console.log('No group ID provided');
    return [];
  }

  try {
    console.log('Fetching group members for group ID:', groupId);
    
    // Get the basic group member records
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return [];
    }
    
    if (!groupMembers || groupMembers.length === 0) {
      console.log('No members found for this group');
      return [];
    }
    
    console.log('Found group members:', groupMembers);
    
    // Get the student IDs
    const studentIds = groupMembers.map(member => member.student_id);
    
    // Fetch profiles for these students
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    console.log('Found profiles:', profiles || []);
    
    // Create a map of profiles by ID
    const profilesMap: Record<string, any> = {};
    if (profiles) {
      profiles.forEach((profile: any) => {
        profilesMap[profile.id] = profile;
      });
    }
    
    // Fetch student_profiles for these students
    const { data: studentProfiles, error: studentProfilesError } = await supabase
      .from('student_profiles')
      .select('*')
      .in('user_id', studentIds);
      
    if (studentProfilesError) {
      console.error('Error fetching student profiles:', studentProfilesError);
    }
    
    console.log('Found student profiles:', studentProfiles || []);
    
    // Create a map of student profiles by user_id
    const studentProfilesMap: Record<string, any> = {};
    if (studentProfiles) {
      studentProfiles.forEach((profile: any) => {
        studentProfilesMap[profile.user_id] = profile;
      });
    }
    
    // Fetch drive links for these students
    const { data: driveLinks, error: linksError } = await supabase
      .from('student_drive_links')
      .select('*')
      .eq('group_id', groupId)
      .in('student_id', studentIds);
      
    if (linksError) {
      console.error('Error fetching drive links:', linksError);
    }
    
    console.log('Found drive links:', driveLinks || []);
    
    // Create a map of drive links by student ID
    const driveLinksMap: Record<string, any[]> = {};
    if (driveLinks) {
      driveLinks.forEach((link: any) => {
        if (!driveLinksMap[link.student_id]) {
          driveLinksMap[link.student_id] = [];
        }
        driveLinksMap[link.student_id].push(link);
      });
    }
    
    // Create group members with actual data from profiles and student_profiles
    const transformedMembers = groupMembers.map(member => {
      // Get profile and student profile data
      const profile = profilesMap[member.student_id] || {};
      const studentProfile = studentProfilesMap[member.student_id] || {};
      
      // Get drive links for this student
      const studentDriveLinks = driveLinksMap[member.student_id] || [];
      
      return {
        id: member.id,
        group_id: member.group_id,
        student_id: member.student_id,
        name: profile.name || 'Unknown',
        usn: studentProfile.usn || '24bsr08100', // Fallback to example if not found
        group_usn: studentProfile.group_usn || 'fhfh',
        class: studentProfile.class || 'FSP - B',
        semester: studentProfile.semester || '2',
        email: profile.email || '24bsr08100@jainuniversity.ac.in',
        drive_links: studentDriveLinks.map((link: any) => ({
          id: link.id,
          group_id: link.group_id,
          student_id: link.student_id,
          url: link.url,
          description: link.description || '',
          created_at: link.created_at,
          updated_at: link.updated_at
        })),
        joined_at: member.joined_at,
        student: {
          id: member.student_id,
          name: profile.name || 'Unknown',
          usn: studentProfile.usn || '24bsr08100',
          group_usn: studentProfile.group_usn || 'fhfh',
          class: studentProfile.class || 'FSP - B',
          semester: studentProfile.semester || '2',
          email: profile.email || '24bsr08100@jainuniversity.ac.in'
        }
      };
    });

    console.log('Returning transformed members:', transformedMembers);
    return transformedMembers;
  } catch (error) {
    console.error('Error in getGroupMembers:', error);
    return [];
  }
};

// Get groups for a specific student
export const getStudentGroups = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('group:groups(*)')
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Error fetching student groups:', error);
      throw error;
    }
    
    // Extract groups from the result
    return data.map(item => item.group);
  } catch (error) {
    console.error('Unexpected error in getStudentGroups:', error);
    throw error;
  }
};

// Get groups for a specific student
export const getStudentGroupsWithFaculty = async (studentId: string): Promise<Group[]> => {
  if (!studentId) {
    console.error('No student ID provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Error fetching student groups:', error);
      return [];
    }

    if (!data) return [];

    // Transform groups to include faculty name
    const groupsWithFaculty = await Promise.all(
      data.map(async (item) => ({
        id: (item.groups as any).id,
        name: (item.groups as any).name,
        faculty_id: (item.groups as any).faculty_id,
        department: (item.groups as any).department,
        pcl_group_no: (item.groups as any).pcl_group_no,
        drive_link: (item.groups as any).drive_link,
        description: (item.groups as any).description,
        created_at: (item.groups as any).created_at,
        faculty_name: await getFacultyName((item.groups as any).faculty_id) || 'Unknown Faculty'
      }))
    );

    return groupsWithFaculty;
  } catch (error) {
    console.error('Unexpected error in getStudentGroupsWithFaculty:', error);
    return [];
  }
}

// Get all students for group selection
export const getAllAvailableStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, student_profiles(*)')
      .eq('role', 'student');
    
    if (error) {
      console.error('Error fetching available students:', error);
      return [];
    }

    if (!data) return [];

    // Filter out students without student_profiles
    const availableStudents = data
      .filter(profile => profile.student_profiles)
      .map(profile => ({
        id: profile.id,
        name: profile.student_profiles?.name || profile.name || '',
        email: profile.email || '',
        usn: profile.student_profiles?.usn || '',
        group_usn: profile.student_profiles?.group_usn || '',
        class: profile.student_profiles?.class || '',
        semester: profile.student_profiles?.semester || ''
      }));

    return availableStudents;
  } catch (error) {
    console.error('Unexpected error in getAllAvailableStudents:', error);
    return [];
  }
};

export const addStudentToGroup = async (groupId: string, studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        student_id: studentId,
        joined_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error adding student to group:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Unexpected error adding student to group:', error);
    return false;
  }
};

export const removeStudentFromGroup = async (groupId: string, studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error removing student from group:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Unexpected error removing student from group:', error);
    return false;
  }
};

// Student Drive Links Functions
// src/lib/api/supabase/groups.ts
export const addStudentDriveLink = async (groupId: string, studentId: string, url: string, description: string) => {
  try {
    console.log('Adding drive link for student:', { groupId, studentId, url });
    if (!groupId || !studentId || !url) {
      throw new Error('Missing required parameters: groupId, studentId, or url');
    }

    // First check if the student already has 5 drive links
    const { data: existingLinks, error: countError } = await supabase
      .from('student_drive_links')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', studentId);
      
    if (!countError && existingLinks && existingLinks.length >= 5) {
      throw new Error('Maximum number of drive links (5) reached');
    }

    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Log authentication information for debugging
    console.log('Current session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      expectedUserId: studentId,
      match: session?.user?.id === studentId
    });
    
    // If the session user ID doesn't match the student ID, we need to update the student ID
    // This ensures RLS policies work correctly
    const effectiveStudentId = session?.user?.id || studentId;
    
    if (session?.user?.id && session.user.id !== studentId) {
      console.log(`Warning: Session user ID (${session.user.id}) doesn't match provided student ID (${studentId}). Using session ID.`);
    }

    // Insert the drive link
    const { data, error } = await supabase
      .from('student_drive_links')
      .insert({
        student_id: effectiveStudentId, // Use the effective student ID
        group_id: groupId,
        url,
        description: description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting drive link:', error);
      throw new Error(`Failed to add drive link: ${error.message}`);
    }
    
    console.log('Successfully added drive link:', data);
    return data;
  } catch (error: any) {
    console.error('Error adding student drive link:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    throw error;
  }
}

export const updateStudentDriveLink = async (linkId: string, url: string, description: string) => {
  try {
    const { data, error } = await supabase
      .from('student_drive_links')
      .update({
        url,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating drive link:', error);
    throw error;
  }
};

export const removeStudentDriveLink = async (linkId: string): Promise<boolean> => {
  try {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Log authentication information for debugging
    console.log('Current session for delete:', {
      hasSession: !!session,
      userId: session?.user?.id
    });
    
    // Delete the drive link
    const { error } = await supabase
      .from('student_drive_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Error removing drive link from database:', error);
      throw error;
    }
    
    console.log('Successfully removed drive link from database:', linkId);
    return true;
  } catch (error) {
    console.error('Error removing drive link:', error);
    return false;
  }
};

// Get drive links for a specific student in a specific group
export const getStudentDriveLinks = async (studentId: string, groupId: string) => {
  try {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Log authentication information for debugging
    console.log('Current session for get links:', {
      hasSession: !!session,
      userId: session?.user?.id,
      expectedUserId: studentId,
      match: session?.user?.id === studentId
    });

    // Fetch drive links from database
    const { data, error } = await supabase
      .from('student_drive_links')
      .select('*')
      .eq('student_id', studentId)
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching student drive links:', error);
      return [];
    }

    console.log('Successfully fetched drive links from database:', data);
    return data || [];
  } catch (error) {
    console.error('Error in getStudentDriveLinks:', error);
    return [];
  }
};
