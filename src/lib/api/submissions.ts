import { supabase } from '../supabase';
import { Submission } from '@/types';

export const createSubmission = async (submission: Partial<Submission>) => {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getSubmissionById = async (id: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      profiles:student_id(*)
    `)
    .eq('assignment_id', assignmentId);
  
  if (error) throw error;
  return data;
};

export const getStudentSubmissions = async (studentId: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assignments:assignment_id(*)
    `)
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
};

export const getStudentSubmissionForAssignment = async (studentId: string, assignmentId: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the error code for no rows returned
  return data;
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
