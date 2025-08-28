import { supabase } from "@/lib/supabase";

export interface StudentAssignmentGroupMember {
  id: string;
  name: string;
  email: string;
  usn?: string;
}

export interface StudentAssignmentGroup {
  id: string;
  group_name: string;
  group_number: number;
  members: StudentAssignmentGroupMember[];
}

/**
 * Get the assignment group that a student belongs to for a specific assignment
 */
export async function getStudentAssignmentGroup(
  assignmentId: string,
  studentId: string
): Promise<StudentAssignmentGroup | null> {
  try {
    // First get assignment groups for this assignment
    const { data: assignmentGroups } = await supabase
      .from('assignment_groups')
      .select('id')
      .eq('assignment_id', assignmentId);

    const groupIds = assignmentGroups?.map(g => g.id) || [];

    if (groupIds.length === 0) {
      return null;
    }

    // Then find the student's membership in those groups
    const { data, error } = await supabase
      .from('assignment_group_members')
      .select(`
        assignment_groups!inner (
          id,
          group_name,
          group_number,
          assignment_group_members (
            profiles!inner (
              id,
              email,
              student_profiles (
                name,
                usn
              )
            )
          )
        )
      `)
      .eq('student_id', studentId)
      .in('assignment_group_id', groupIds)
      .single();

    if (error || !data) {
      return null;
    }

    const group = Array.isArray(data.assignment_groups) 
      ? data.assignment_groups[0] 
      : data.assignment_groups;
      
    const members = group.assignment_group_members.map((member: any) => ({
      id: member.profiles.id,
      name: member.profiles.student_profiles[0]?.name || 'Unknown',
      email: member.profiles.email,
      usn: member.profiles.student_profiles[0]?.usn || ''
    }));

    return {
      id: group.id,
      group_name: group.group_name,
      group_number: group.group_number,
      members
    };
  } catch (error) {
    console.error('Error fetching student assignment group:', error);
    return null;
  }
}
