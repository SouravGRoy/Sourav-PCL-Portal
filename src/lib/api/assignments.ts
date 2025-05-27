import { supabase } from '../supabase';
import { Assignment } from '@/types';

export const createAssignment = async (assignment: Partial<Assignment>) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating assignment:', error);
      throw new Error(`Failed to create assignment: ${error.message}`, { cause: error });
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in createAssignment:', error);
    throw error instanceof Error ? error : new Error('Unexpected error in createAssignment', { cause: error });
  }
};

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

export const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteAssignment = async (id: string) => {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getGroupAssignments = async (groupId: string) => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('group_id', groupId);
  
  if (error) throw error;
  return data;
};

export const getFacultyAssignments = async (facultyId: string) => {
  // Get all groups for this faculty
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('faculty_id', facultyId);
  
  if (groupsError) throw groupsError;
  
  const groupIds = groups.map(group => group.id);
  
  // Get all assignments for these groups
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .in('group_id', groupIds);
  
  if (error) throw error;
  return data;
};

export const getStudentAssignments = async (studentId: string) => {
  try {
    // Get all groups this student is a member of
    const { data: memberships, error: membershipsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('student_id', studentId);
    
    if (membershipsError) {
      console.error('Error fetching student memberships:', membershipsError);
      throw new Error(`Failed to fetch student memberships: ${membershipsError.message}`, { cause: membershipsError });
    }
    
    // If student is not a member of any group, return empty array
    if (!memberships || memberships.length === 0) {
      return [];
    }
    
    const groupIds = memberships.map(membership => membership.group_id);
    
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
