"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/api/supabase/auth";
import { Group, Student, GroupMember } from "@/types";
import { GroupsAPI, StudentsAPI } from "@/lib/api";
import CreateGroupForm from "./create-group-form";
import GroupCard from "./group-card";

export default function GroupManagement() {
  const { user } = useUserStore();
  const { showToast } = useToast(); // Changed back to showToast which is the correct API
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch groups and all students on component mount or when user changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchInitialData = async () => {
      if (!user) {
        setGroups([]);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Fetch groups
        const facultyGroups = await GroupsAPI.getGroupsByFaculty(user.id);
        
        // Fetch all students
        const allStudentsData = await StudentsAPI.getAllStudents();
        console.log('Loaded all students:', allStudentsData.length);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setGroups(facultyGroups || []);
          setAllStudents(allStudentsData);
          
          // Filter out students already in groups
          if (selectedGroup) {
            const members = await GroupsAPI.getGroupMembers(selectedGroup.id);
            const existingStudentIds = members.map(member => member.student_id);
            const availableStudents = allStudentsData.filter(
              (student: Student) => !existingStudentIds.includes(student.id)
            );
            setSearchResults(availableStudents);
          } else {
            setSearchResults(allStudentsData);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        if (isMounted) {
          showToast({
            title: "Error",
            description: "Failed to load data",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, selectedGroup]); // Added selectedGroup as dependency

  // Fetch group members when selected group changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchGroupMembers = async () => {
      if (!selectedGroup) {
        setGroupMembers([]);
        return;
      }
      
      try {
        const members = await GroupsAPI.getGroupMembers(selectedGroup.id);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setGroupMembers(members || []);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
        if (isMounted) {
          showToast({
            title: "Error",
            description: "Failed to fetch group members",
            variant: "destructive",
          });
          setGroupMembers([]);
        }
      }
    };

    fetchGroupMembers();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [selectedGroup]); // Removed showToast from dependencies

  const handleGroupCreated = async () => {
    try {
      if (!user) return;
      setIsLoading(true);
      const updatedGroups = await GroupsAPI.getGroupsByFaculty(user.id);
      setGroups(updatedGroups || []);
      showToast({
        title: "Success",
        description: "Group created successfully",
      });
    } catch (error) {
      console.error("Error refreshing groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      // If no search term, show all students or clear results
      if (!searchTerm.trim()) {
        // Reload all students
        const allStudents = await StudentsAPI.getAllStudents();
        console.log('Loaded all students:', allStudents.length);
        setSearchResults(allStudents || []);
        return;
      }

      console.log('Filtering students with term:', searchTerm);
      
      // Get all students if we don't already have them
      let allStudents = [];
      if (searchResults.length === 0) {
        allStudents = await StudentsAPI.getAllStudents();
        console.log('Loaded all students for filtering:', allStudents.length);
      } else {
        allStudents = searchResults;
      }
      
      // Filter the students by USN or name
      const filteredStudents = allStudents.filter(student => {
        const studentName = student?.name || '';
        const studentUsn = student?.usn || '';
        const studentEmail = student?.email || '';
        
        return (
          studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          studentUsn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      console.log('Students found after filtering:', filteredStudents.length);
      
      // Make sure we don't show students already in the group
      const existingStudentIds = groupMembers.map(member => member.student_id);
      const availableStudents = filteredStudents.filter(
        student => !existingStudentIds.includes(student.id)
      );
      
      setSearchResults(availableStudents);
    } catch (error) {
      console.error("Error searching for students:", error);
      showToast({
        title: "Error",
        description: "Failed to search for students",
        variant: "destructive",
      });
      
      // Try to load all students as a fallback
      try {
        const allStudents = await StudentsAPI.getAllStudents();
        setSearchResults(allStudents || []);
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudentToGroup = async (studentId: string) => {
    if (!selectedGroup) {
      showToast({
        title: "Error",
        description: "No group selected",
        variant: "destructive",
      });
      return;
    }

    if (!studentId) {
      showToast({
        title: "Error",
        description: "Invalid student ID",
        variant: "destructive",
      });
      return;
    }

    console.log("Adding student with ID:", studentId, "to group:", selectedGroup.id);
    setIsLoading(true);
    
    try {
      // Add the student to the group
      await GroupsAPI.addStudentToGroup(selectedGroup.id, studentId);
      
      // Refresh the group members list
      const updatedMembers = await GroupsAPI.getGroupMembers(selectedGroup.id);
      console.log("Updated members after addition:", updatedMembers.length);
      setGroupMembers(updatedMembers);
      
      // Remove the added student from the search results
      setSearchResults((prev) =>
        prev.filter((student) => student.id !== studentId)
      );
      
      showToast({
        title: "Success",
        description: "Student added to group",
      });
    } catch (error) {
      console.error("Error adding student to group:", error);
      showToast({
        title: "Error",
        description: "Failed to add student to group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStudentFromGroup = async (studentId: string) => {
    if (!selectedGroup) {
      showToast({
        title: "Error",
        description: "No group selected",
        variant: "destructive",
      });
      return;
    }

    if (!studentId) {
      showToast({
        title: "Error",
        description: "Invalid student ID",
        variant: "destructive",
      });
      return;
    }

    console.log("Removing student with ID:", studentId, "from group:", selectedGroup.id);
    setIsLoading(true);
    
    try {
      // First, log the student details we're trying to remove
      const studentToRemove = groupMembers.find(member => member.student_id === studentId);
      console.log("Student to remove:", studentToRemove);
      
      if (!studentToRemove) {
        console.error("Cannot find student in group members");
        showToast({
          title: "Error",
          description: "Cannot find student in group",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Perform the removal
      await GroupsAPI.removeStudentFromGroup(selectedGroup.id, studentId);
      
      // Force a direct check to see if the student was actually removed
      const { data: checkData } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', selectedGroup.id)
        .eq('student_id', studentId);
      
      if (checkData && checkData.length > 0) {
        console.error("Student was not removed from database:", checkData);
        showToast({
          title: "Error",
          description: "Failed to remove student from group",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Manually remove the student from the local state
      setGroupMembers(prev => prev.filter(member => member.student_id !== studentId));
      
      // Create a profile for the removed student to add back to search results
      const newStudentProfile: Student = {
        id: studentToRemove.student_id || '',
        name: studentToRemove.name || 'Reyna',
        usn: studentToRemove.usn || '24bsr08100',
        email: studentToRemove.email || '',
        class: studentToRemove.class || 'FSP - B',
        semester: studentToRemove.semester || '2',
        group_usn: studentToRemove.group_usn || 'fhfh'
      };
      
      // Add the removed student back to search results
      setSearchResults(prev => {
        if (!prev.some((s: Student) => s.id === studentId)) {
          return [...prev, newStudentProfile];
        }
        return prev;
      });
      
      showToast({
        title: "Success",
        description: "Student removed from group",
      });
    } catch (error) {
      console.error("Error removing student from group:", error);
      showToast({
        title: "Error",
        description: "Failed to remove student from group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!groupId) return;

    setIsLoading(true);
    try {
      await GroupsAPI.deleteGroup(groupId);
      
      // Remove the deleted group from the list
      setGroups((prevGroups) => prevGroups.filter((g) => g.id !== groupId));
      
      // Clear the selected group if it was the one deleted
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }

      showToast({
        title: "Success",
        description: "Group deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting group:", error);
      showToast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <CreateGroupForm onSuccess={handleGroupCreated} />
        </div>

        <div className="md:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p>No groups found. Create your first group!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isSelected={selectedGroup?.id === group.id}
                  isLoading={isLoading}
                  groupMembers={groupMembers}
                  searchResults={searchResults}
                  onSelect={handleSelectGroup}
                  onSearch={handleSearch}
                  onAddStudent={handleAddStudentToGroup}
                  onRemoveStudent={handleRemoveStudentFromGroup}
                  onDeleteGroup={handleDeleteGroup}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
