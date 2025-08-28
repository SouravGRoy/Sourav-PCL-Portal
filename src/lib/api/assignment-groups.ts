import { supabase } from '@/lib/supabase';

export interface AssignmentGroup {
  id: string;
  assignment_id: string;
  group_name: string;
  group_number: number;
  created_at: string;
}

export interface AssignmentGroupMember {
  id: string;
  assignment_group_id: string;
  student_id: string;
  joined_at: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Create assignment groups automatically (random or manual)
 */
export async function createAssignmentGroups(
  assignmentId: string,
  groupSize: number,
  formationType: 'random' | 'manual'
): Promise<{ success: boolean; groups: AssignmentGroup[]; error?: string }> {
  try {
    // First, check if groups already exist for this assignment
    const { data: existingGroups, error: checkError } = await supabase
      .from('assignment_groups')
      .select('*')
      .eq('assignment_id', assignmentId);

    if (checkError) {
      throw new Error(`Error checking existing groups: ${checkError.message}`);
    }

    if (existingGroups && existingGroups.length > 0) {
      return {
        success: false,
        groups: [],
        error: 'Groups already exist for this assignment. Delete existing groups first.'
      };
    }

        // Get the assignment and its class students
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        groups!inner (
          id,
          name,
          group_members!inner (
            student_id,
            profiles!inner (
              id,
              email,
              student_profiles!inner (
                name
              )
            )
          )
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError) {
      throw new Error(`Error fetching assignment: ${assignmentError.message}`);
    }

    // Get students from the class/group that this assignment belongs to
    // Handle both array and single object structure for groups
    const groupsData = Array.isArray(assignment.groups) ? assignment.groups[0] : assignment.groups;
    const students = groupsData?.group_members || [];
    const totalStudents = students.length;
    
    if (totalStudents === 0) {
      return {
        success: false,
        groups: [],
        error: 'No students found in this class.'
      };
    }

    // Calculate number of groups needed
    const numberOfGroups = Math.ceil(totalStudents / groupSize);
    
    // Create empty groups first
    const groupsToCreate = [];
    for (let i = 1; i <= numberOfGroups; i++) {
      const groupLetter = String.fromCharCode(64 + i); // A, B, C, etc.
      groupsToCreate.push({
        assignment_id: assignmentId,
        group_name: `Group ${groupLetter}`,
        group_number: i
      });
    }

    const { data: createdGroups, error: createError } = await supabase
      .from('assignment_groups')
      .insert(groupsToCreate)
      .select();

    if (createError) {
      throw new Error(`Error creating groups: ${createError.message}`);
    }

    // If random assignment, automatically assign students
    if (formationType === 'random' && createdGroups) {
      await assignStudentsRandomly(students, createdGroups, groupSize);
    }

    return {
      success: true,
      groups: createdGroups || [],
    };
  } catch (error) {
    console.error('Error in createAssignmentGroups:', error);
    return {
      success: false,
      groups: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Assign students randomly to groups
 */
async function assignStudentsRandomly(
  students: any[],
  groups: AssignmentGroup[],
  groupSize: number
): Promise<void> {
  // Shuffle students randomly
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
  
  const membersToInsert = [];
  let currentGroupIndex = 0;
  let studentsInCurrentGroup = 0;

  for (const student of shuffledStudents) {
    membersToInsert.push({
      assignment_group_id: groups[currentGroupIndex].id,
      student_id: student.student_id
    });

    studentsInCurrentGroup++;
    
    // Move to next group if current group is full
    if (studentsInCurrentGroup >= groupSize && currentGroupIndex < groups.length - 1) {
      currentGroupIndex++;
      studentsInCurrentGroup = 0;
    }
  }

  // Insert all group members
  const { error } = await supabase
    .from('assignment_group_members')
    .insert(membersToInsert);

  if (error) {
    throw new Error(`Error assigning students: ${error.message}`);
  }
}

/**
 * Get assignment groups with members
 */
export async function getAssignmentGroups(assignmentId: string): Promise<{
  groups: (AssignmentGroup & { members: AssignmentGroupMember[] })[];
  availableStudents: any[];
}> {
  try {
    // Get groups
    const { data: groups, error: groupsError } = await supabase
      .from('assignment_groups')
      .select(`
        *,
        assignment_group_members (
          id,
          student_id,
          joined_at,
          profiles!inner (
            id,
            email,
            student_profiles (
              name
            )
          )
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('group_number');

    if (groupsError) {
      throw new Error(`Error fetching groups: ${groupsError.message}`);
    }

    // Get all students in the class that this assignment belongs to
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        groups!inner (
          id,
          name,
          group_members!inner (
            student_id,
            profiles!inner (
              id,
              email,
              student_profiles!inner (
                name
              )
            )
          )
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError) {
      throw new Error(`Error fetching assignment: ${assignmentError.message}`);
    }

    // Handle both array and single object structure for groups
    const groupsData = Array.isArray(assignment.groups) ? assignment.groups[0] : assignment.groups;
    const allStudents = groupsData?.group_members || [];
    
    console.log("Raw assignment data:", JSON.stringify(assignment, null, 2));
    console.log("Groups data type:", Array.isArray(assignment.groups) ? 'array' : 'object');
    console.log("All students found:", allStudents.length);
    console.log("Sample student:", allStudents[0]);
    
    // Get students already assigned to groups
    const assignedStudentIds = new Set();
    (groups || []).forEach((group: any) => {
      group.assignment_group_members.forEach((member: any) => {
        assignedStudentIds.add(member.student_id);
      });
    });

    console.log("Assigned student IDs:", Array.from(assignedStudentIds));

    // Filter available students (not yet assigned)
    const availableStudents = allStudents.filter(
      (student: any) => !assignedStudentIds.has(student.student_id)
    );

    console.log("Available students count:", availableStudents.length);
    console.log("Available students structure:", availableStudents.slice(0, 2));

    // Transform groups with members
    const transformedGroups = (groups || []).map((group: any) => ({
      ...group,
      members: group.assignment_group_members.map((member: any) => ({
        id: member.id,
        assignment_group_id: group.id,
        student_id: member.student_id,
        joined_at: member.joined_at,
        student: {
          id: member.profiles.id,
          name: member.profiles.student_profiles?.[0]?.name || 'Unknown',
          email: member.profiles.email
        }
      }))
    }));

    return {
      groups: transformedGroups,
      availableStudents
    };
  } catch (error) {
    console.error('Error in getAssignmentGroups:', error);
    throw error;
  }
}

/**
 * Add student to a specific group manually
 */
export async function addStudentToAssignmentGroup(
  assignmentGroupId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Adding student to assignment group:", { assignmentGroupId, studentId });
    
    const { error } = await supabase
      .from('assignment_group_members')
      .insert({
        assignment_group_id: assignmentGroupId,
        student_id: studentId
      });

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Error adding student to group: ${error.message}`);
    }

    console.log("Student added successfully");
    return { success: true };
  } catch (error) {
    console.error('Error in addStudentToAssignmentGroup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Remove student from assignment group
 */
export async function removeStudentFromAssignmentGroup(
  assignmentGroupId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('assignment_group_members')
      .delete()
      .eq('assignment_group_id', assignmentGroupId)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Error removing student from group: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeStudentFromAssignmentGroup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete all assignment groups
 */
export async function deleteAssignmentGroups(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('assignment_groups')
      .delete()
      .eq('assignment_id', assignmentId);

    if (error) {
      throw new Error(`Error deleting groups: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteAssignmentGroups:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get student's assignment group for a specific assignment
 */
export async function getStudentAssignmentGroup(
  assignmentId: string,
  studentId: string
): Promise<{
  group: (AssignmentGroup & { members: AssignmentGroupMember[] }) | null;
  error?: string;
}> {
  try {
    // First get assignment groups for this assignment
    const { data: assignmentGroups } = await supabase
      .from('assignment_groups')
      .select('id')
      .eq('assignment_id', assignmentId);

    const groupIds = assignmentGroups?.map(g => g.id) || [];

    if (groupIds.length === 0) {
      return { group: null };
    }

    // Then find the student's membership in those groups
    const { data: groupMember, error: memberError } = await supabase
      .from('assignment_group_members')
      .select(`
        assignment_group_id,
        assignment_groups!inner (
          id,
          assignment_id,
          group_name,
          group_number,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .in('assignment_group_id', groupIds)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        // No group found for student
        return { group: null };
      }
      throw new Error(`Error fetching student group: ${memberError.message}`);
    }

    if (!groupMember) {
      return { group: null };
    }

    // Get all members of this group
    const { data: allMembers, error: membersError } = await supabase
      .from('assignment_group_members')
      .select(`
        id,
        student_id,
        joined_at,
        profiles!inner (
          id,
          email,
          student_profiles (
            name
          )
        )
      `)
      .eq('assignment_group_id', groupMember.assignment_group_id);

    if (membersError) {
      throw new Error(`Error fetching group members: ${membersError.message}`);
    }

    const assignmentGroup = groupMember.assignment_groups;
    const group: AssignmentGroup & { members: AssignmentGroupMember[] } = {
      id: (assignmentGroup as any).id,
      assignment_id: (assignmentGroup as any).assignment_id,
      group_name: (assignmentGroup as any).group_name,
      group_number: (assignmentGroup as any).group_number,
      created_at: (assignmentGroup as any).created_at,
      members: (allMembers || []).map((member: any) => ({
        id: member.id,
        assignment_group_id: groupMember.assignment_group_id,
        student_id: member.student_id,
        joined_at: member.joined_at,
        student: {
          id: member.profiles.id,
          name: member.profiles.student_profiles?.[0]?.name || 'Unknown',
          email: member.profiles.email
        }
      }))
    };

    return { group };
  } catch (error) {
    console.error('Error in getStudentAssignmentGroup:', error);
    return {
      group: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
