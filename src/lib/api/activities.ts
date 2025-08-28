import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date-utils";

export interface Activity {
  id: string;
  type: 'group_created' | 'assignment_created' | 'submission_received' | 'announcement_created';
  title: string;
  description: string;
  timestamp: string;
  group_id?: string;
  group_name?: string;
  actor_name?: string;
  actor_role?: string;
  metadata?: any;
}

/**
 * Get recent activities for a faculty across all their groups
 */
export async function getFacultyRecentActivities(facultyId: string, limit: number = 10): Promise<Activity[]> {
  const activities: Activity[] = [];

  try {
    // Get faculty's groups first
    const { data: facultyGroups } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId);

    if (!facultyGroups || facultyGroups.length === 0) {
      return activities;
    }

    const groupIds = facultyGroups.map(g => g.id);
    const groupMap = new Map(facultyGroups.map(g => [g.id, g.name]));

    // 1. Group creation activities
    const { data: groupActivities } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        created_at,
        faculty_id,
        profiles!groups_faculty_id_fkey(id, email)
      `)
      .eq('faculty_id', facultyId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (groupActivities) {
      groupActivities.forEach(group => {
        activities.push({
          id: `group_${group.id}`,
          type: 'group_created',
          title: 'Class Created',
          description: `New class "${group.name}" was created`,
          timestamp: group.created_at,
          group_id: group.id,
          group_name: group.name,
          actor_name: 'You',
          actor_role: 'faculty'
        });
      });
    }

    // 2. Assignment creation activities
    const { data: assignmentActivities } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        created_at,
        group_id,
        created_by,
        groups!assignments_group_id_fkey(name)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignmentActivities) {
      assignmentActivities.forEach(assignment => {
        activities.push({
          id: `assignment_${assignment.id}`,
          type: 'assignment_created',
          title: 'Assignment Created',
          description: `New assignment "${assignment.title}" was created`,
          timestamp: assignment.created_at,
          group_id: assignment.group_id,
          group_name: (assignment.groups as any)?.name || groupMap.get(assignment.group_id),
          actor_name: 'You',
          actor_role: 'faculty'
        });
      });
    }

    // 3. Student submission activities - FIXED: Get assignments first, then submissions
    const { data: facultyAssignments } = await supabase
      .from('assignments')
      .select('id')
      .in('group_id', groupIds);

    const assignmentIds = facultyAssignments?.map(a => a.id) || [];

    const { data: submissionActivities } = assignmentIds.length > 0 ? await supabase
      .from('assignment_submissions')
      .select(`
        id,
        submitted_at,
        student_id,
        assignment_id,
        assignments!assignment_submissions_assignment_id_fkey(
          title,
          group_id,
          groups!assignments_group_id_fkey(name)
        ),
        profiles!assignment_submissions_student_id_fkey(
          id,
          student_profiles(name)
        )
      `)
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })
      .limit(15) : { data: null };

    if (submissionActivities) {
      submissionActivities.forEach(submission => {
        const studentName = (submission.profiles as any)?.student_profiles?.[0]?.name || 'Student';
        const assignmentTitle = (submission.assignments as any)?.title || 'Assignment';
        const groupName = (submission.assignments as any)?.groups?.name;
        
        activities.push({
          id: `submission_${submission.id}`,
          type: 'submission_received',
          title: 'Submission Received',
          description: `${studentName} submitted "${assignmentTitle}"`,
          timestamp: submission.submitted_at,
          group_id: (submission.assignments as any)?.group_id,
          group_name: groupName,
          actor_name: studentName,
          actor_role: 'student'
        });
      });
    }

    // 4. Announcement creation activities - Enhanced security
    const { data: announcementActivities } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        created_at,
        group_id,
        faculty_id,
        priority,
        groups!announcements_group_id_fkey(name)
      `)
      .eq('faculty_id', facultyId)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (announcementActivities) {
      announcementActivities.forEach(announcement => {
        activities.push({
          id: `announcement_${announcement.id}`,
          type: 'announcement_created',
          title: 'Announcement Made',
          description: `Posted "${announcement.title}"`,
          timestamp: announcement.created_at,
          group_id: announcement.group_id,
          group_name: (announcement.groups as any)?.name,
          actor_name: 'You',
          actor_role: 'faculty',
          metadata: { priority: announcement.priority }
        });
      });
    }

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);

  } catch (error) {
    console.error('Error fetching faculty activities:', error);
    return [];
  }
}

/**
 * Get recent activities for a specific group/class
 * SECURITY: Added access control to prevent viewing activities from unauthorized groups
 */
export async function getGroupRecentActivities(groupId: string, limit: number = 10, userId?: string): Promise<Activity[]> {
  const activities: Activity[] = [];

  try {
    // Get group details and verify access (optional security check)
    const { data: group } = await supabase
      .from('groups')
      .select('id, name, faculty_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return activities;
    }

    // Optional: Add user access verification
    // if (userId) {
    //   // Check if user is faculty of this group OR student member of this group
    //   const isFaculty = group.faculty_id === userId;
    //   if (!isFaculty) {
    //     const { data: membership } = await supabase
    //       .from('group_members')
    //       .select('id')
    //       .eq('group_id', groupId)
    //       .eq('student_id', userId)
    //       .single();
    //     if (!membership) {
    //       return activities; // User has no access to this group
    //     }
    //   }
    // }

    // 1. Assignment creation activities for this group
    const { data: assignmentActivities } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        created_at,
        group_id,
        created_by,
        profiles!assignments_created_by_fkey(id, email)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignmentActivities) {
      assignmentActivities.forEach(assignment => {
        activities.push({
          id: `assignment_${assignment.id}`,
          type: 'assignment_created',
          title: 'Assignment Created',
          description: `New assignment "${assignment.title}" was created`,
          timestamp: assignment.created_at,
          group_id: groupId,
          group_name: group.name,
          actor_name: 'You',
          actor_role: 'faculty'
        });
      });
    }

    // 2. Student submission activities for this group - FIXED: Get assignments first, then submissions
    const { data: groupAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('group_id', groupId);

    const assignmentIds = groupAssignments?.map(a => a.id) || [];

    const { data: submissionActivities } = assignmentIds.length > 0 ? await supabase
      .from('assignment_submissions')
      .select(`
        id,
        submitted_at,
        student_id,
        assignment_id,
        assignments!assignment_submissions_assignment_id_fkey(
          title,
          group_id
        ),
        profiles!assignment_submissions_student_id_fkey(
          id,
          student_profiles(name)
        )
      `)
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })
      .limit(15) : { data: null };

    if (submissionActivities) {
      submissionActivities.forEach(submission => {
        const studentName = (submission.profiles as any)?.student_profiles?.[0]?.name || 'Student';
        const assignmentTitle = (submission.assignments as any)?.title || 'Assignment';
        
        activities.push({
          id: `submission_${submission.id}`,
          type: 'submission_received',
          title: 'Submission Received',
          description: `${studentName} submitted "${assignmentTitle}"`,
          timestamp: submission.submitted_at,
          group_id: groupId,
          group_name: group.name,
          actor_name: studentName,
          actor_role: 'student'
        });
      });
    }

    // 3. Announcement creation activities for this group
    const { data: announcementActivities } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        created_at,
        group_id,
        faculty_id,
        priority
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (announcementActivities) {
      announcementActivities.forEach(announcement => {
        activities.push({
          id: `announcement_${announcement.id}`,
          type: 'announcement_created',
          title: 'Announcement Made',
          description: `Posted "${announcement.title}"`,
          timestamp: announcement.created_at,
          group_id: groupId,
          group_name: group.name,
          actor_name: 'You',
          actor_role: 'faculty',
          metadata: { priority: announcement.priority }
        });
      });
    }

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);

  } catch (error) {
    console.error('Error fetching group activities:', error);
    return [];
  }
}

/**
 * Get activity icon and color based on activity type
 */
export function getActivityIcon(type: Activity['type']): { icon: string; color: string } {
  switch (type) {
    case 'group_created':
      return { icon: '🏫', color: 'bg-purple-500' };
    case 'assignment_created':
      return { icon: '📝', color: 'bg-blue-500' };
    case 'submission_received':
      return { icon: '✅', color: 'bg-green-500' };
    case 'announcement_created':
      return { icon: '📢', color: 'bg-orange-500' };
    default:
      return { icon: '⚪', color: 'bg-gray-500' };
  }
}

/**
 * Get recent activities for a student across their groups
 */
export async function getStudentRecentActivities(studentId: string, limit: number = 10): Promise<Activity[]> {
  const activities: Activity[] = [];

  try {
    // Get student's groups first
    const { data: studentGroups } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups!group_members_group_id_fkey(id, name, faculty_id)
      `)
      .eq('student_id', studentId);

    if (!studentGroups || studentGroups.length === 0) {
      return activities;
    }

    const groupIds = studentGroups.map(g => g.group_id);
    const groupMap = new Map(studentGroups.map(g => [g.group_id, (g.groups as any)?.name]));

    // 1. Assignment creation activities in student's groups
    const { data: assignmentActivities } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        created_at,
        group_id,
        created_by,
        groups!assignments_group_id_fkey(name)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignmentActivities) {
      assignmentActivities.forEach(assignment => {
        activities.push({
          id: `assignment_${assignment.id}`,
          type: 'assignment_created',
          title: 'New Assignment',
          description: `New assignment "${assignment.title}" was posted`,
          timestamp: assignment.created_at,
          group_id: assignment.group_id,
          group_name: (assignment.groups as any)?.name || groupMap.get(assignment.group_id),
          actor_name: 'Faculty',
          actor_role: 'faculty'
        });
      });
    }

    // 2. Student's own submission activities
    const { data: submissionActivities } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        submitted_at,
        assignment_id,
        assignments!assignment_submissions_assignment_id_fkey(
          title,
          group_id,
          groups!assignments_group_id_fkey(name)
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (submissionActivities) {
      submissionActivities.forEach(submission => {
        const assignmentTitle = (submission.assignments as any)?.title || 'Assignment';
        const groupName = (submission.assignments as any)?.groups?.name;
        
        activities.push({
          id: `submission_${submission.id}`,
          type: 'submission_received',
          title: 'Assignment Submitted',
          description: `You submitted "${assignmentTitle}"`,
          timestamp: submission.submitted_at,
          group_id: (submission.assignments as any)?.group_id,
          group_name: groupName,
          actor_name: 'You',
          actor_role: 'student'
        });
      });
    }

    // 3. Announcement activities in student's groups
    const { data: announcementActivities } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        created_at,
        group_id,
        priority,
        groups!announcements_group_id_fkey(name)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (announcementActivities) {
      announcementActivities.forEach(announcement => {
        activities.push({
          id: `announcement_${announcement.id}`,
          type: 'announcement_created',
          title: 'New Announcement',
          description: `New announcement: "${announcement.title}"`,
          timestamp: announcement.created_at,
          group_id: announcement.group_id,
          group_name: (announcement.groups as any)?.name,
          actor_name: 'Faculty',
          actor_role: 'faculty',
          metadata: { priority: announcement.priority }
        });
      });
    }

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);

  } catch (error) {
    console.error('Error fetching student activities:', error);
    return [];
  }
}

/**
 * Get relative time string for activity
 */
export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMs = now.getTime() - activityTime.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDateTime(timestamp);
  }
}
