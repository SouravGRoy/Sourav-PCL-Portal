import { supabase } from '../supabase';
import { Submission } from '@/types';

export const createSubmission = async (submission: Partial<Submission>) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert(submission)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating submission:', error);
      throw new Error(`Failed to create submission: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in createSubmission:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createSubmission', { cause: error });
  }
};

export const getSubmissionById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching submission:', error);
      throw new Error(`Failed to fetch submission: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getSubmissionById:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getSubmissionById', { cause: error });
  }
};

export const updateSubmission = async (id: string, updates: Partial<Submission>) => {
  const { data, error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteSubmission = async (id: string) => {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getAssignmentSubmissions = async (assignmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles:student_id(*)
      `)
      .eq('assignment_id', assignmentId);
    
    if (error) {
      console.error('Error fetching assignment submissions:', error);
      throw new Error(`Failed to fetch assignment submissions: ${error.message}`, { cause: error });
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getAssignmentSubmissions:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getAssignmentSubmissions', { cause: error });
  }
};

export const getStudentSubmissions = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments:assignment_id(*)
      `)
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Error fetching student submissions:', error);
      throw new Error(`Failed to fetch student submissions: ${error.message}`, { cause: error });
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getStudentSubmissions:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in getStudentSubmissions', { cause: error });
  }
};

export const getStudentSubmissionForAssignment = async (studentId: string, assignmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId)
      .single();
    
    if (error) {
      // PGRST116 is the error code for no rows returned, which is expected in some cases
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

export const provideFeedback = async (submissionId: string, feedback: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .update({
      feedback,
      status: 'reviewed',
    })
    .eq('id', submissionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
