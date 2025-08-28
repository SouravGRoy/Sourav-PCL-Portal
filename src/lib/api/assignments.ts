import { supabase } from '../supabase';

export interface AssignmentData {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: 'individual' | 'group';
  status: 'draft' | 'active' | 'completed' | 'archived';
  max_score: number;
  due_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  group_size?: number;
  group_formation_type?: 'random' | 'manual' | 'self_select';
  allow_late_submission: boolean;
  late_submission_penalty: number;
  enable_peer_review: boolean;
  metadata: any;
}

export interface AssignmentRubric {
  id: string;
  assignment_id: string;
  criteria_name: string;
  criteria_description?: string;
  max_points: number;
  order_index: number;
}

export interface CreateAssignmentData {
  group_id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: 'individual' | 'group';
  max_score: number;
  due_date: string;
  group_size?: number;
  group_formation_type?: 'random' | 'manual' | 'self_select';
  allow_late_submission?: boolean;
  late_submission_penalty?: number;
  enable_peer_review?: boolean;
  rubric_criteria?: Array<{
    criteria_name: string;
    criteria_description?: string;
    max_points: number;
  }>;
}

/**
 * Get all assignments for a specific group
 */
export async function getGroupAssignments(groupId: string): Promise<AssignmentData[]> {
  try {
    console.log('Fetching assignments for group ID:', groupId);
    
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        assignment_rubrics (
          id,
          criteria_name,
          criteria_description,
          max_points,
          order_index
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching group assignments:', error);
      throw new Error(`Failed to fetch assignments: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} assignments for group:`, groupId);
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getGroupAssignments:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getGroupAssignments', { cause: error });
  }
}

/**
 * Create a new assignment
 */
export async function createAssignment(assignmentData: CreateAssignmentData): Promise<AssignmentData> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Extract rubric criteria and remove from assignment data
  const { rubric_criteria, ...assignmentFields } = assignmentData;

  // Start a transaction
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      ...assignmentFields,
      created_by: user.user.id,
      status: 'draft'
    })
    .select()
    .single();

  if (assignmentError) {
    throw new Error(`Failed to create assignment: ${assignmentError.message}`);
  }

  // Create rubric criteria if provided
  if (rubric_criteria && rubric_criteria.length > 0) {
    const rubricData = rubric_criteria.map((criteria, index) => ({
      assignment_id: assignment.id,
      criteria_name: criteria.criteria_name,
      criteria_description: criteria.criteria_description,
      max_points: criteria.max_points,
      order_index: index
    }));

    const { error: rubricError } = await supabase
      .from('assignment_rubrics')
      .insert(rubricData);

    if (rubricError) {
      // Rollback assignment creation if rubric creation fails
      await supabase.from('assignments').delete().eq('id', assignment.id);
      throw new Error(`Failed to create assignment rubrics: ${rubricError.message}`);
    }
  }

  return assignment;
}

export const getAssignmentById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching assignment:', error);
      throw new Error(`Failed to fetch assignment: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getAssignmentById:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getAssignmentById', { cause: error });
  }
};

export const updateAssignment = async (assignmentId: string, updateData: {
  title?: string;
  description?: string;
  instructions?: string;
  max_score?: number;
  due_date?: string;
  status?: 'draft' | 'active' | 'completed' | 'archived';
  group_size?: number;
  group_formation_type?: 'random' | 'manual' | 'self_select';
  rubric_criteria?: Array<{
    id?: string;
    criteria_name: string;
    criteria_description?: string;
    max_points: number;
  }>;
}) => {
  try {
    // Separate rubric data from assignment data
    const { rubric_criteria, ...assignmentData } = updateData;
    
    // Update assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .update({
        ...assignmentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (assignmentError) {
      console.error('Error updating assignment:', assignmentError);
      throw new Error(`Failed to update assignment: ${assignmentError.message}`, { cause: assignmentError });
    }

    // Handle rubric updates if provided
    if (rubric_criteria && rubric_criteria.length > 0) {
      // Delete existing rubrics
      const { error: deleteError } = await supabase
        .from('assignment_rubrics')
        .delete()
        .eq('assignment_id', assignmentId);

      if (deleteError) {
        console.error('Error deleting existing rubrics:', deleteError);
        throw new Error(`Failed to delete existing rubrics: ${deleteError.message}`, { cause: deleteError });
      }

      // Insert new rubrics
      const rubricsToInsert = rubric_criteria.map((criteria, index) => ({
        assignment_id: assignmentId,
        criteria_name: criteria.criteria_name,
        criteria_description: criteria.criteria_description,
        max_points: criteria.max_points,
        order_index: index,
      }));

      const { error: rubricError } = await supabase
        .from('assignment_rubrics')
        .insert(rubricsToInsert);

      if (rubricError) {
        console.error('Error creating updated rubrics:', rubricError);
        throw new Error(`Failed to create updated rubrics: ${rubricError.message}`, { cause: rubricError });
      }
    }

    return assignment;
  } catch (error) {
    console.error('Unexpected error in updateAssignment:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in updateAssignment', { cause: error });
  }
};

export const deleteAssignment = async (assignmentId: string) => {
  try {
    // First delete related rubrics (they should cascade, but being explicit)
    const { error: rubricError } = await supabase
      .from('assignment_rubrics')
      .delete()
      .eq('assignment_id', assignmentId);

    if (rubricError) {
      console.error('Error deleting assignment rubrics:', rubricError);
      // Don't throw here, continue with assignment deletion
    }

    // Delete the assignment
    const { error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (assignmentError) {
      console.error('Error deleting assignment:', assignmentError);
      throw new Error(`Failed to delete assignment: ${assignmentError.message}`, { cause: assignmentError });
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteAssignment:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in deleteAssignment', { cause: error });
  }
};

// Get assignment details with rubrics
export const getAssignmentDetails = async (assignmentId: string) => {
  try {
    // Get assignment with rubrics and class information
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        assignment_rubrics (
          id,
          criteria_name,
          criteria_description,
          max_points,
          order_index
        ),
        groups!inner (
          id,
          name,
          group_members (
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
      console.error('Error fetching assignment details:', assignmentError);
      throw new Error(`Failed to fetch assignment details: ${assignmentError.message}`, { cause: assignmentError });
    }

    console.log('Assignment details loaded:', assignment);
    return assignment;
  } catch (error) {
    console.error('Unexpected error in getAssignmentDetails:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getAssignmentDetails', { cause: error });
  }
};

// Get submission statistics for an assignment
export const getSubmissionStats = async (assignmentId: string) => {
  try {
    // Get submission counts and statistics
    const { data: submissions, error: submissionError } = await supabase
      .from('assignment_submissions')
      .select('id, submitted_at, total_score, graded_at')
      .eq('assignment_id', assignmentId);

    if (submissionError) {
      console.error('Error fetching submission stats:', submissionError);
      throw new Error(`Failed to fetch submission stats: ${submissionError.message}`, { cause: submissionError });
    }

    // Get assignment and its group information
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        due_date,
        group_id,
        groups!inner (
          id
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError) {
      console.error('Error fetching assignment details:', assignmentError);
    }

    // Get actual student count from group membership
    let totalStudents = 25; // fallback
    if (assignment?.group_id) {
      const { count: studentCount, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', assignment.group_id);
      
      if (!countError && studentCount !== null) {
        totalStudents = studentCount;
      }
    }

    const dueDate = assignment ? new Date(assignment.due_date) : new Date();
    const submissionList = submissions || [];
    
    const stats = {
      total_students: totalStudents,
      submitted: submissionList.length,
      graded: submissionList.filter(s => s.graded_at).length,
      pending: submissionList.filter(s => !s.graded_at).length,
      late_submissions: submissionList.filter(s => 
        s.submitted_at && new Date(s.submitted_at) > dueDate
      ).length,
      average_score: submissionList.filter(s => s.total_score !== null).length > 0 
        ? submissionList.filter(s => s.total_score !== null).reduce((sum, s) => sum + (s.total_score || 0), 0) / submissionList.filter(s => s.total_score !== null).length
        : 0,
      highest_score: submissionList.filter(s => s.total_score !== null).length > 0 
        ? Math.max(...submissionList.filter(s => s.total_score !== null).map(s => s.total_score || 0))
        : 0,
      lowest_score: submissionList.filter(s => s.total_score !== null).length > 0 
        ? Math.min(...submissionList.filter(s => s.total_score !== null).map(s => s.total_score || 0))
        : 0,
    };

    return stats;
  } catch (error) {
    console.error('Unexpected error in getSubmissionStats:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getSubmissionStats', { cause: error });
  }
};

// Get assignment submission count for dashboard (lightweight version)
export const getAssignmentSubmissionCount = async (assignmentId: string, groupId: string) => {
  try {
    // Get submission count
    const { count: submissionCount, error: submissionError } = await supabase
      .from('assignment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId);

    if (submissionError) {
      console.error('Error fetching submission count:', submissionError);
      return { submitted: 0, total: 0 };
    }

    // Get total student count for the group
    const { count: totalStudents, error: countError } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (countError) {
      console.error('Error fetching student count:', countError);
      return { submitted: submissionCount || 0, total: 0 };
    }

    return {
      submitted: submissionCount || 0,
      total: totalStudents || 0
    };
  } catch (error) {
    console.error('Unexpected error in getAssignmentSubmissionCount:', error);
    return { submitted: 0, total: 0 };
  }
};

export const getFacultyAssignments = async (facultyId: string) => {
  try {
    // Get all groups for this faculty
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId);
    
    if (groupsError) throw groupsError;
    
    const groupIds = groups.map(group => group.id);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    // Get assignments with basic data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .in('group_id', groupIds);
    
    if (assignmentsError) throw assignmentsError;
    
    // For each assignment, get submission counts and student counts
    const assignmentsWithCounts = await Promise.all(
      assignments.map(async (assignment) => {
        // Get submission count for this assignment
        const { count: submissionCount, error: submissionError } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);
          
        // Get graded submission count for this assignment
        const { count: gradedCount, error: gradedError } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)
          .eq('status', 'graded');
          
        // Get student count for this assignment's group
        const { count: studentCount, error: studentError } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', assignment.group_id);
        
        // Find group name
        const groupName = groups.find(g => g.id === assignment.group_id)?.name || 'Unknown Class';
        
        return {
          ...assignment,
          group_name: groupName,
          submissions_count: submissionCount || 0,
          graded_submissions_count: gradedCount || 0,
          total_students: studentCount || 0,
        };
      })
    );
    
    return assignmentsWithCounts;
  } catch (error) {
    console.error('Error in getFacultyAssignments:', error);
    throw error;
  }
};

export const getStudentAssignments = async (studentId: string) => {
  try {
    // First get all groups where the student is a member
    const { data: groups, error: groupError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('student_id', studentId);

    if (groupError) {
      console.error('Error fetching student groups:', groupError);
      throw new Error(`Failed to fetch student groups: ${groupError.message}`, { cause: groupError });
    }

    if (!groups || groups.length === 0) {
      return [];
    }

    const groupIds = groups.map(g => g.group_id);
    
    // Get all assignments for these groups
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .in('group_id', groupIds);
    
    if (error) {
      console.error('Error fetching student assignments:', error);
      throw new Error(`Failed to fetch student assignments: ${error.message}`, { cause: error });
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getStudentAssignments:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentAssignments', { cause: error });
  }
};

// Get assignment submissions with student details for grading
export const getAssignmentSubmissions = async (assignmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        profiles!student_id (
          id,
          email,
          role,
          student_profiles!user_id (
            name,
            usn,
            class
          )
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignment submissions:', error);
      throw new Error(`Failed to fetch assignment submissions: ${error.message}`, { cause: error });
    }
    
    // Transform the data to match the expected interface
    const transformedData = (data || []).map(submission => ({
      ...submission,
      student: {
        id: submission.profiles?.id || submission.student_id,
        name: submission.profiles?.student_profiles?.[0]?.name || 'Unknown Student',
        email: submission.profiles?.email || ''
      }
    }));

    return transformedData;
  } catch (error) {
    console.error('Unexpected error in getAssignmentSubmissions:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getAssignmentSubmissions', { cause: error });
  }
};

// Update submission with grade and feedback
export const updateSubmissionGrade = async (
  submissionId: string, 
  grade: number, 
  feedback: string,
  rubricScores?: Record<string, number>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const gradedBy = user?.id;

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        total_score: grade,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: gradedBy
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating submission grade:', error);
      throw new Error(`Failed to update submission grade: ${error.message}`, { cause: error });
    }

    // If rubric scores are provided, save them to assignment_submission_scores table
    if (rubricScores && Object.keys(rubricScores).length > 0) {
      const rubricScoreEntries = Object.entries(rubricScores).map(([rubricId, score]) => ({
        submission_id: submissionId,
        rubric_id: rubricId,
        score,
        graded_by: gradedBy,
        graded_at: new Date().toISOString()
      }));

      const { error: rubricError } = await supabase
        .from('assignment_submission_scores')
        .upsert(rubricScoreEntries);

      if (rubricError) {
        console.error('Error saving rubric scores:', rubricError);
        // Don't throw here as the main grade was saved successfully
      }
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in updateSubmissionGrade:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in updateSubmissionGrade', { cause: error });
  }
};
