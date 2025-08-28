import { supabase } from '../supabase';

interface StudentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  assignment_group_id?: string;
  submission_text?: string;
  submission_url?: string;
  file_attachments?: any[];
  submitted_at: string;
  is_late: boolean;
  total_score?: number;
  feedback?: string;
  status: "draft" | "submitted" | "graded" | "returned";
}

// Get all submissions for a student
export const getStudentSubmissions = async (studentId: string) => {
  try {
    console.log('Fetching student submissions for student ID:', studentId);
    
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments (
          id,
          title,
          description,
          max_score,
          due_date,
          type,
          group_id
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching student submissions:', error);
      throw new Error(`Failed to fetch student submissions: ${error.message}`, { cause: error });
    }
    
    console.log(`Found ${data?.length || 0} submissions for student:`, studentId);
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getStudentSubmissions:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentSubmissions', { cause: error });
  }
};

// Get a specific submission for an assignment and student
export const getStudentSubmissionForAssignment = async (studentId: string, assignmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId)
      .single();
    
    if (error) {
      // PGRST116 is the error code for no rows returned, which is expected when no submission exists
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching student submission for assignment:', error);
      throw new Error(`Failed to fetch student submission for assignment: ${error.message}`, { cause: error });
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getStudentSubmissionForAssignment:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentSubmissionForAssignment', { cause: error });
  }
};

// Create a new submission
export const createStudentSubmission = async (submissionData: Partial<StudentSubmission>) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        ...submissionData,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student submission:', error);
      throw new Error(`Failed to create student submission: ${error.message}`, { cause: error });
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in createStudentSubmission:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createStudentSubmission', { cause: error });
  }
};

// Update an existing submission
export const updateStudentSubmission = async (submissionId: string, updates: Partial<StudentSubmission>) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        ...updates,
        submitted_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating student submission:', error);
      throw new Error(`Failed to update student submission: ${error.message}`, { cause: error });
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in updateStudentSubmission:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in updateStudentSubmission', { cause: error });
  }
};

// Get submissions with grades for a student (for grade tracking)
export const getStudentGrades = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments (
          id,
          title,
          max_score,
          due_date,
          group_id,
          groups:group_id (
            name
          )
        ),
        submission_scores:assignment_submission_scores (
          score,
          feedback,
          rubric:assignment_rubrics (
            criteria_name,
            max_points
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching student grades:', error);
      throw new Error(`Failed to fetch student grades: ${error.message}`, { cause: error });
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getStudentGrades:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentGrades', { cause: error });
  }
};

// Get submissions for a specific assignment (for students to see their submission)
export const getSubmissionById = async (submissionId: string) => {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments (
          id,
          title,
          description,
          instructions,
          max_score,
          due_date,
          type,
          assignment_rubrics (
            id,
            criteria_name,
            criteria_description,
            max_points,
            order_index
          )
        ),
        submission_scores:assignment_submission_scores (
          score,
          feedback,
          rubric:assignment_rubrics (
            criteria_name,
            max_points
          )
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) {
      console.error('Error fetching submission by id:', error);
      throw new Error(`Failed to fetch submission: ${error.message}`, { cause: error });
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getSubmissionById:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getSubmissionById', { cause: error });
  }
};

// Get assignment submission status overview for student dashboard
export const getStudentSubmissionOverview = async (studentId: string) => {
  try {
    // Get all assignments the student has access to
    const { data: assignments, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        max_score,
        status,
        group_id,
        groups:group_id (
          name,
          group_members!inner (
            student_id
          )
        )
      `)
      .eq('groups.group_members.student_id', studentId)
      .eq('status', 'active');

    if (assignmentError) {
      console.error('Error fetching assignments for overview:', assignmentError);
      throw new Error(`Failed to fetch assignments: ${assignmentError.message}`, { cause: assignmentError });
    }

    // Get all submissions for this student
    const { data: submissions, error: submissionError } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, status, total_score, submitted_at')
      .eq('student_id', studentId);

    if (submissionError) {
      console.error('Error fetching submissions for overview:', submissionError);
      throw new Error(`Failed to fetch submissions: ${submissionError.message}`, { cause: submissionError });
    }

    // Combine data to show submission status for each assignment
    const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);
    
    const overview = (assignments || []).map(assignment => {
      const submission = submissionMap.get(assignment.id);
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      
      return {
        assignment,
        submission,
        isOverdue: !submission && now > dueDate,
        daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    return overview;
  } catch (error) {
    console.error('Unexpected error in getStudentSubmissionOverview:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentSubmissionOverview', { cause: error });
  }
};
