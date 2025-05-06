import { supabase } from '../supabase';
import { Assignment } from '@/types';

export const createAssignment = async (assignment: Partial<Assignment>) => {
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getAssignmentById = async (id: string) => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
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
  // Get all groups this student is a member of
  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('student_id', studentId);
  
  if (membershipsError) throw membershipsError;
  
  const groupIds = memberships.map(membership => membership.group_id);
  
  // Get all assignments for these groups
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .in('group_id', groupIds);
  
  if (error) throw error;
  return data;
};
