import { supabase } from "@/lib/supabase";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'normal' | 'low';
  group_id: string;
  faculty_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  description: string;
  priority: 'high' | 'normal' | 'low';
  group_id: string;
  faculty_id: string;
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  console.log('Creating announcement with data:', data);
  
  try {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        group_id: data.group_id,
        faculty_id: data.faculty_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating announcement:', error);
      throw new Error(`Failed to create announcement: ${error.message || 'Unknown database error'}`);
    }

    if (!announcement) {
      console.error('No announcement returned from database');
      throw new Error('Failed to create announcement: No data returned from database');
    }

    console.log('Successfully created announcement:', announcement);
    return announcement;
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create announcement: Unknown error occurred');
  }
}

/**
 * Get all announcements for a specific group
 */
export async function getGroupAnnouncements(groupId: string): Promise<Announcement[]> {
  console.log('Fetching announcements for group:', groupId);
  
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching group announcements:', error);
      throw new Error(`Failed to fetch group announcements: ${error.message || 'Unknown database error'}`);
    }

    console.log('Successfully fetched announcements:', announcements?.length || 0);
    return announcements || [];
  } catch (error) {
    console.error('Error in getGroupAnnouncements:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch group announcements: Unknown error occurred');
  }
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(id: string, data: Partial<CreateAnnouncementData>): Promise<Announcement> {
  console.log('Updating announcement:', id, 'with data:', data);
  
  try {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating announcement:', error);
      throw new Error(`Failed to update announcement: ${error.message || 'Unknown database error'}`);
    }

    if (!announcement) {
      console.error('No announcement returned after update');
      throw new Error('Failed to update announcement: No data returned from database');
    }

    console.log('Successfully updated announcement:', announcement);
    return announcement;
  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update announcement: Unknown error occurred');
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  console.log('Deleting announcement:', id);
  
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting announcement:', error);
      throw new Error(`Failed to delete announcement: ${error.message || 'Unknown database error'}`);
    }

    console.log('Successfully deleted announcement:', id);
  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete announcement: Unknown error occurred');
  }
}

/**
 * Get announcements for all groups that a student is a member of
 */
export async function getStudentAnnouncements(studentId: string): Promise<Announcement[]> {
  console.log('Fetching announcements for student:', studentId);
  
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select(`
        *,
        groups!inner (
          id,
          name,
          group_members!inner (
            student_id
          )
        )
      `)
      .eq('groups.group_members.student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching student announcements:', error);
      throw new Error(`Failed to fetch student announcements: ${error.message || 'Unknown database error'}`);
    }

    console.log('Successfully fetched student announcements:', announcements?.length || 0);
    return announcements || [];
  } catch (error) {
    console.error('Error in getStudentAnnouncements:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch student announcements: Unknown error occurred');
  }
}
