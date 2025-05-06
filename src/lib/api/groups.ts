import { supabase } from '../supabase';
import { Group, GroupMember } from '@/types';

export const createGroup = async (group: Partial<Group>) => {
  const { data, error } = await supabase
    .from('groups')
    .insert(group)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getGroupById = async (id: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateGroup = async (id: string, updates: Partial<Group>) => {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateGroupDriveLink = async (id: string, driveLink: string) => {
  const { data, error } = await supabase
    .from('groups')
    .update({ drive_link: driveLink })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteGroup = async (id: string) => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getGroupsByFaculty = async (facultyId: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('faculty_id', facultyId);
  
  if (error) throw error;
  return data;
};

// Group membership functions
export const addStudentToGroup = async (groupId: string, studentId: string) => {
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      student_id: studentId,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const removeStudentFromGroup = async (groupId: string, studentId: string) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId);
  
  if (error) throw error;
};

export const getGroupMembers = async (groupId: string) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      profiles:student_id(*)
    `)
    .eq('group_id', groupId);
  
  if (error) throw error;
  return data;
};

export const getStudentGroups = async (studentId: string) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      groups:group_id(*)
    `)
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data.map(item => item.groups);
};
