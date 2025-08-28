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
    throw new Error(`Failed to fetch assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new assignment
 */
export async function createAssignment(assignmentData: CreateAssignmentData): Promise<AssignmentData> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Start a transaction
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      ...assignmentData,
      created_by: user.user.id,
      status: 'draft'
    })
    .select()
    .single();

  if (assignmentError) {
    throw new Error(`Failed to create assignment: ${assignmentError.message}`);
  }

  // Create rubric criteria if provided
  if (assignmentData.rubric_criteria && assignmentData.rubric_criteria.length > 0) {
    const rubricData = assignmentData.rubric_criteria.map((criteria, index) => ({
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

/**
 * Get assignment statistics
 */
export async function getAssignmentStats(assignmentId: string) {
  const { data, error } = await supabase
    .rpc('get_assignment_stats', { p_assignment_id: assignmentId });

  if (error) {
    throw new Error(`Failed to get assignment stats: ${error.message}`);
  }

  return data[0] || {
    total_submissions: 0,
    graded_submissions: 0,
    average_score: 0,
    submission_rate: 0
  };
}
