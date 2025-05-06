"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserStore } from '@/lib/store';
import * as localDB from '@/lib/local-storage-db';

interface Group {
  id: string;
  name: string;
  department: string;
  pcl_group_no: string;
  faculty_id: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  usn: string;
  group_usn: string;
  class: string;
  semester: string;
}

interface DriveLink {
  id: string;
  url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
  student: Student;
  drive_links?: DriveLink[];
}

export default function GroupManagement() {
  const { user } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    department: '',
    pcl_group_no: ''
  });
  
  // Fetch groups created by this faculty member
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        const devEmail = localStorage.getItem('userEmail');
        const devRole = localStorage.getItem('userRole');
        
        if (devEmail && (devRole === 'faculty' || devRole === 'superadmin')) {
          // In development mode, use the dev email to identify the faculty
          console.log('DEVELOPMENT MODE: Fetching groups for faculty:', devEmail);
          
          // In a real implementation, we would fetch from Supabase
          // For now, we'll use localStorage to persist groups in development mode
          const storedGroups = localStorage.getItem('facultyGroups_' + devEmail);
          if (storedGroups) {
            setGroups(JSON.parse(storedGroups));
          } else {
            setGroups([]);
          }
        } else if (user) {
          // In production mode, fetch groups from Supabase
          // import { getGroupsByFaculty } from '@/lib/api/groups';
          // const facultyGroups = await getGroupsByFaculty(user.id);
          // setGroups(facultyGroups);
          
          // For now, we'll use localStorage in both modes
          const storedGroups = localStorage.getItem('facultyGroups_' + user.email);
          if (storedGroups) {
            setGroups(JSON.parse(storedGroups));
          } else {
            setGroups([]);
          }
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
  }, [user]);
  
  // Load group members when a group is selected
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (selectedGroup) {
        try {
          // In a real implementation, we would fetch from Supabase
          // import { getGroupMembers } from '@/lib/api/groups';
          // const members = await getGroupMembers(selectedGroup.id);
          // setGroupMembers(members);
          
          // For now, we'll use localStorage to persist group members in development mode
          const storedMembers = localStorage.getItem(`groupMembers_${selectedGroup.id}`);
          if (storedMembers) {
            const members = JSON.parse(storedMembers);
            
            // Fetch drive links for each student
            const membersWithLinks = await Promise.all(members.map(async (member: GroupMember) => {
              if (member.student && member.student.email) {
                // Get drive links for this student
                const driveLinks = localDB.getStudentDriveLinks(member.student.email, selectedGroup.id);
                return {
                  ...member,
                  drive_links: driveLinks
                };
              }
              return member;
            }));
            
            setGroupMembers(membersWithLinks);
          } else {
            setGroupMembers([]);
          }
        } catch (error) {
          console.error('Error fetching group members:', error);
          setGroupMembers([]);
        }
      } else {
        setGroupMembers([]);
      }
    };
    
    fetchGroupMembers();
  }, [selectedGroup]);
  
  // Search for students
  const handleSearch = async () => {
    if (!searchTerm.trim() || !selectedGroup) return;
    
    setIsLoading(true);
    
    try {
      // In a real implementation, we would search using the API
      // import { searchStudents } from '@/lib/api/students';
      // const students = await searchStudents(searchTerm);
      
      // For development mode, we'll use localStorage to simulate a database of students
      // First, check if we have any registered students in localStorage
      const allStudentProfiles = [];
      
      // Scan localStorage for student profiles
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('studentProfile_')) {
          try {
            const profile = JSON.parse(localStorage.getItem(key) || '{}');
            if (profile && profile.name) {
              // Create a student object from the profile
              const email = key.replace('studentProfile_', '');
              
              // Store the index with the key so we can use it for consistent ID generation
              localStorage.setItem(`studentIndex_${email}`, i.toString());
              
              allStudentProfiles.push({
                id: `student-${i}`,  // In real app, this would be the user ID
                name: profile.name,
                email: email,
                usn: profile.usn || '',
                group_usn: profile.group_usn || '',
                class: profile.class || '',
                semester: profile.semester || ''
              });
            }
          } catch (e) {
            console.error('Error parsing student profile:', e);
          }
        }
      }
      
      // Filter students based on search term
      const filteredStudents = allStudentProfiles.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        return (
          student.name.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower) ||
          student.usn.toLowerCase().includes(searchLower)
        );
      });
      
      // Filter out students who are already in the group
      const existingStudentIds = groupMembers.map(member => member.student_id);
      const availableStudents = filteredStudents.filter(
        student => !existingStudentIds.includes(student.id)
      );
      
      setSearchResults(availableStudents);
    } catch (error) {
      console.error('Error searching for students:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add student to group
  const addStudentToGroup = async (student: Student) => {
    if (!selectedGroup) return;
    
    try {
      console.log('Adding student to group:', student);
      console.log('Selected group:', selectedGroup);
      
      // Create a new group member
      const newMember: GroupMember = {
        id: `gm${Date.now()}`,
        group_id: selectedGroup.id,
        student_id: student.id,
        joined_at: new Date().toISOString(),
        student: student
      };
      
      console.log('Created new group member object:', newMember);
      
      // In a real implementation, we would use the API
      // import { addStudentToGroup } from '@/lib/api/groups';
      // await addStudentToGroup(selectedGroup.id, student.id);
      
      // Add to group members
      const updatedMembers = [...groupMembers, newMember];
      setGroupMembers(updatedMembers);
      
      // Store in localStorage for persistence in development mode
      console.log(`Storing group members in localStorage with key: groupMembers_${selectedGroup.id}`);
      console.log('Members data being stored:', JSON.stringify(updatedMembers, null, 2));
      localStorage.setItem(`groupMembers_${selectedGroup.id}`, JSON.stringify(updatedMembers));
      
      // ALSO use our new localStorage database helper to ensure student can see this group
      const success = localDB.addStudentToGroup(student.email, selectedGroup.id, selectedGroup);
      if (!success) {
        throw new Error('Failed to add student to group in localStorage');
      }
      
      // Clear search results
      setSearchResults([]);
      setSearchTerm('');
      
      // Show success message
      alert(`Student ${student.name} added to group ${selectedGroup.name}`);
    } catch (error) {
      console.error('Error adding student to group:', error);
      alert('Error adding student to group. See console for details.');
    }
  };
  
  // Remove student from group
  const removeStudentFromGroup = async (memberId: string) => {
    try {
      if (!selectedGroup) return;
      
      // Find the member to get their email before removing
      const memberToRemove = groupMembers.find(member => member.id === memberId);
      
      // In a real implementation, we would use the API
      // import { removeStudentFromGroup } from '@/lib/api/groups';
      // if (memberToRemove) {
      //   await removeStudentFromGroup(selectedGroup.id, memberToRemove.student_id);
      // }
      
      const updatedMembers = groupMembers.filter(member => member.id !== memberId);
      setGroupMembers(updatedMembers);
      
      // Store in localStorage for persistence in development mode
      localStorage.setItem(`groupMembers_${selectedGroup.id}`, JSON.stringify(updatedMembers));
      
      // ALSO use our new localStorage database helper to ensure student no longer sees this group
      if (memberToRemove && memberToRemove.student && memberToRemove.student.email) {
        localDB.removeStudentFromGroup(memberToRemove.student.email, selectedGroup.id);
      }
    } catch (error) {
      console.error('Error removing student from group:', error);
    }
  };
  
  // Create new group
  const handleCreateGroup = () => {
    if (!newGroup.name || !newGroup.department || !newGroup.pcl_group_no) return;
    
    const group: Group = {
      id: `g${Date.now()}`,
      name: newGroup.name,
      department: newGroup.department,
      pcl_group_no: newGroup.pcl_group_no,
      faculty_id: 'dev-faculty-id',
      created_at: new Date().toISOString()
    };
    
    // Update state and localStorage
    const updatedGroups = [...groups, group];
    setGroups(updatedGroups);
    
    // Store faculty's groups in localStorage
    const devEmail = localStorage.getItem('userEmail');
    if (devEmail) {
      localStorage.setItem('facultyGroups_' + devEmail, JSON.stringify(updatedGroups));
    }
    
    setNewGroup({ name: '', department: '', pcl_group_no: '' });
    setIsCreatingGroup(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Group Management</h1>
          <p className="text-gray-600 mt-1">Create and manage student groups</p>
        </div>
        <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Enter the details for the new student group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  placeholder="Web Development Team"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department Name</Label>
                <Input
                  id="department"
                  value={newGroup.department}
                  onChange={(e) => setNewGroup({...newGroup, department: e.target.value})}
                  placeholder="Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcl-group-no">PCL Group Number</Label>
                <Input
                  id="pcl-group-no"
                  value={newGroup.pcl_group_no}
                  onChange={(e) => setNewGroup({...newGroup, pcl_group_no: e.target.value})}
                  placeholder="PCL001"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>Cancel</Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Groups</CardTitle>
              <CardDescription>Select a group to manage members</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No groups created yet</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div 
                      key={group.id} 
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedGroup?.id === group.id ? 'bg-blue-100 border-blue-300 border' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <h3 className="font-medium">{group.name}</h3>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{group.department}</span>
                        <span>PCL: {group.pcl_group_no}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {selectedGroup ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedGroup.name}</CardTitle>
                <CardDescription>
                  Department: {selectedGroup.department} | PCL Group: {selectedGroup.pcl_group_no}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Add Students</h3>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Search by USN or email" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 rounded-full border-t-transparent"></div>
                        ) : 'Search'}
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Search Results</h4>
                        <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                          {searchResults.map((student) => (
                            <div key={student.id} className="p-3 flex justify-between items-center">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-500">{student.usn} | {student.email}</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => addStudentToGroup(student)}
                              >
                                Add to Group
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Group Members</h3>
                    {groupMembers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No students in this group yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>USN</TableHead>
                            <TableHead>Group USN</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Semester</TableHead>
                            <TableHead>Drive Links</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">{member.student.name}</TableCell>
                              <TableCell>{member.student.usn}</TableCell>
                              <TableCell>{member.student.group_usn}</TableCell>
                              <TableCell>{member.student.class}</TableCell>
                              <TableCell>{member.student.semester}</TableCell>
                              <TableCell>
                                {member.drive_links && member.drive_links.length > 0 ? (
                                  <div className="space-y-1">
                                    {member.drive_links.map((link, index) => (
                                      <div key={link.id} className="flex items-center">
                                        <a 
                                          href={link.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline text-xs truncate max-w-[150px] inline-block"
                                        >
                                          {index + 1}. {link.description || link.url}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">No links</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500"
                                  onClick={() => removeStudentFromGroup(member.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-8">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">No Group Selected</h3>
                <p className="text-gray-500 mt-2">Select a group from the list or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
