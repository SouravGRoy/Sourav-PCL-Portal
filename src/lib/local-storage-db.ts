/**
 * This file provides a simple localStorage-based database for development mode
 * It helps maintain consistent data between faculty and student views
 */

import { StudentDriveLink } from '@/types';

// Keys for different types of data
const KEYS = {
  STUDENT_GROUPS: 'studentGroups', // Maps student emails to group IDs
  GROUP_STUDENTS: 'groupStudents', // Maps group IDs to student emails
  STUDENT_DRIVE_LINKS: 'studentDriveLinks', // Maps student email + group ID to drive links
  FACULTY_GROUPS: 'facultyGroups', // Maps faculty emails to groups
};

/**
 * Add a student to a group
 */
export const addStudentToGroup = (studentEmail: string, groupId: string, groupData: any) => {
  try {
    console.log(`Adding student ${studentEmail} to group ${groupId}`);
    
    // 1. Update student -> groups mapping
    const studentGroupsKey = `${KEYS.STUDENT_GROUPS}_${studentEmail}`;
    const existingStudentGroups = JSON.parse(localStorage.getItem(studentGroupsKey) || '[]');
    
    // Check if the student is already in this group
    if (!existingStudentGroups.some((g: any) => g.id === groupId)) {
      // Add the group and ensure we have all necessary data
      const completeGroupData = {
        ...groupData,
        id: groupId,
        created_at: new Date().toISOString()
      };
      existingStudentGroups.push(completeGroupData);
      localStorage.setItem(studentGroupsKey, JSON.stringify(existingStudentGroups));
      console.log(`Updated student groups for ${studentEmail}:`, existingStudentGroups);
    }
    
    // 2. Update group -> students mapping
    const groupStudentsKey = `${KEYS.GROUP_STUDENTS}_${groupId}`;
    const existingGroupStudents = JSON.parse(localStorage.getItem(groupStudentsKey) || '[]');
    
    // Check if the group already has this student
    if (!existingGroupStudents.includes(studentEmail)) {
      existingGroupStudents.push(studentEmail);
      localStorage.setItem(groupStudentsKey, JSON.stringify(existingGroupStudents));
      console.log(`Updated group students for ${groupId}:`, existingGroupStudents);
    }
    
    // 3. Ensure the group exists in faculty's groups list
    // This ensures the group doesn't disappear on refresh
    let facultyEmail = '';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${KEYS.FACULTY_GROUPS}_`)) {
        const email = key.replace(`${KEYS.FACULTY_GROUPS}_`, '');
        const facultyGroups = JSON.parse(localStorage.getItem(key) || '[]');
        const groupIndex = facultyGroups.findIndex((g: any) => g.id === groupId);
        
        if (groupIndex !== -1) {
          facultyEmail = email;
          // Update the group data if it exists
          facultyGroups[groupIndex] = {
            ...facultyGroups[groupIndex],
            ...groupData
          };
          localStorage.setItem(key, JSON.stringify(facultyGroups));
          break;
        }
      }
    }

    // 4. Add faculty email to group data if we found it
    if (facultyEmail) {
      // Update all instances of this group with faculty email
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(groupId)) {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          const updatedData = data.map((item: any) => 
            item.id === groupId ? { ...item, faculty_id: facultyEmail } : item
          );
          localStorage.setItem(key, JSON.stringify(updatedData));
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error adding student to group in localStorage:', error);
    return false;
  }
};

/**
 * Get all groups for a student
 */
export const getStudentGroups = (studentEmail: string) => {
  try {
    const studentGroupsKey = `${KEYS.STUDENT_GROUPS}_${studentEmail}`;
    const studentGroups = JSON.parse(localStorage.getItem(studentGroupsKey) || '[]');
    
    // Verify that these groups still exist in faculty groups
    // This helps ensure consistency between faculty and student views
    const verifiedGroups = studentGroups.filter((group: any) => {
      // Check if this group exists in any faculty's groups
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${KEYS.FACULTY_GROUPS}_`)) {
          const facultyGroups = JSON.parse(localStorage.getItem(key) || '[]');
          const matchingGroup = facultyGroups.find((g: any) => g.id === group.id);
          if (matchingGroup) {
            // Update the group data with the latest from faculty's list
            return {
              ...group,
              ...matchingGroup
            };
          }
        }
      }
      return false;
    });

    // Filter out any false values from the map operation
    return verifiedGroups.filter(Boolean);
  } catch (error) {
    console.error('Error getting student groups from localStorage:', error);
    return [];
  }
};

/**
 * Get all students in a group
 */
export const getGroupStudents = (groupId: string) => {
  try {
    const groupStudentsKey = `${KEYS.GROUP_STUDENTS}_${groupId}`;
    return JSON.parse(localStorage.getItem(groupStudentsKey) || '[]');
  } catch (error) {
    console.error('Error getting group students from localStorage:', error);
    return [];
  }
};

/**
 * Remove a student from a group
 */
export const removeStudentFromGroup = (studentEmail: string, groupId: string) => {
  try {
    // 1. Update student -> groups mapping
    const studentGroupsKey = `${KEYS.STUDENT_GROUPS}_${studentEmail}`;
    const existingStudentGroups = JSON.parse(localStorage.getItem(studentGroupsKey) || '[]');
    const updatedStudentGroups = existingStudentGroups.filter((g: any) => g.id !== groupId);
    localStorage.setItem(studentGroupsKey, JSON.stringify(updatedStudentGroups));
    
    // 2. Update group -> students mapping
    const groupStudentsKey = `${KEYS.GROUP_STUDENTS}_${groupId}`;
    const existingGroupStudents = JSON.parse(localStorage.getItem(groupStudentsKey) || '[]');
    const updatedGroupStudents = existingGroupStudents.filter((email: string) => email !== studentEmail);
    localStorage.setItem(groupStudentsKey, JSON.stringify(updatedGroupStudents));
    
    return true;
  } catch (error) {
    console.error('Error removing student from group in localStorage:', error);
    return false;
  }
};

/**
 * Add or update a student's drive link for a specific group
 */
export const addStudentDriveLink = (studentEmail: string, groupId: string, driveLink: string, description: string = '') => {
  try {
    const key = `${KEYS.STUDENT_DRIVE_LINKS}_${studentEmail}_${groupId}`;
    const existingLinks = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Check if we already have 5 links and this isn't an update
    if (existingLinks.length >= 5 && !existingLinks.some((link: StudentDriveLink) => link.url === driveLink)) {
      console.warn('Maximum of 5 drive links reached for this student in this group');
      return { success: false, message: 'Maximum of 5 drive links reached' };
    }
    
    // Check if this link already exists (update it)
    const linkIndex = existingLinks.findIndex((link: StudentDriveLink) => link.url === driveLink);
    
    if (linkIndex >= 0) {
      // Update existing link
      existingLinks[linkIndex] = {
        ...existingLinks[linkIndex],
        description,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add new link
      existingLinks.push({
        id: `link_${Date.now()}`,
        url: driveLink,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    localStorage.setItem(key, JSON.stringify(existingLinks));
    
    // Update the group members to include this drive link
    // This ensures the faculty can see the student's drive links
    const groupMembersKey = `groupMembers_${groupId}`;
    const groupMembers = JSON.parse(localStorage.getItem(groupMembersKey) || '[]');
    
    // Find the student in the group members
    const updatedGroupMembers = groupMembers.map((member: any) => {
      if (member.student && member.student.email === studentEmail) {
        return {
          ...member,
          drive_links: existingLinks
        };
      }
      return member;
    });
    
    localStorage.setItem(groupMembersKey, JSON.stringify(updatedGroupMembers));
    
    return { success: true, links: existingLinks };
  } catch (error) {
    console.error('Error adding student drive link:', error);
    return { success: false, message: 'Error adding drive link' };
  }
};

/**
 * Get all drive links for a student in a specific group
 */
export const getStudentDriveLinks = (studentEmail: string, groupId: string) => {
  try {
    const key = `${KEYS.STUDENT_DRIVE_LINKS}_${studentEmail}_${groupId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.error('Error getting student drive links:', error);
    return [];
  }
};

/**
 * Remove a student's drive link
 */
export const removeStudentDriveLink = (studentEmail: string, groupId: string, linkId: string) => {
  try {
    const key = `${KEYS.STUDENT_DRIVE_LINKS}_${studentEmail}_${groupId}`;
    const existingLinks = JSON.parse(localStorage.getItem(key) || '[]');
    const updatedLinks = existingLinks.filter((link: StudentDriveLink) => link.id !== linkId);
    localStorage.setItem(key, JSON.stringify(updatedLinks));
    
    // Update the group members to reflect the removed drive link
    // This ensures the faculty can see the updated drive links
    const groupMembersKey = `groupMembers_${groupId}`;
    const groupMembers = JSON.parse(localStorage.getItem(groupMembersKey) || '[]');
    
    // Find the student in the group members
    const updatedGroupMembers = groupMembers.map((member: any) => {
      if (member.student && member.student.email === studentEmail) {
        return {
          ...member,
          drive_links: updatedLinks
        };
      }
      return member;
    });
    
    localStorage.setItem(groupMembersKey, JSON.stringify(updatedGroupMembers));
    
    return { success: true, links: updatedLinks };
  } catch (error) {
    console.error('Error removing student drive link:', error);
    return { success: false, message: 'Error removing drive link' };
  }
};
