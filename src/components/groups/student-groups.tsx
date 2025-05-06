"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUserStore } from '@/lib/store';
import * as localDB from '@/lib/local-storage-db';

interface Group {
  id: string;
  name: string;
  department: string;
  pcl_group_no: string;
  faculty_id: string;
  faculty_name: string;
  created_at: string;
  drive_link?: string;
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
  name: string;
  usn: string;
  group_usn: string;
  class: string;
  semester: string;
  email?: string;
  drive_links?: DriveLink[];
}

export default function StudentGroups() {
  const { user } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [driveLink, setDriveLink] = useState('');
  const [driveLinkDescription, setDriveLinkDescription] = useState('');
  const [isUpdatingLink, setIsUpdatingLink] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [myDriveLinks, setMyDriveLinks] = useState<DriveLink[]>([]);
  
  // Fetch groups that the student is a member of
  useEffect(() => {
    const fetchStudentGroups = async () => {
      try {
        setIsLoading(true);
        const devEmail = localStorage.getItem('userEmail');
        const devRole = localStorage.getItem('userRole');
        
        // Debug: List all localStorage keys
        console.log('DEBUG: Listing all localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          console.log(`${i}: ${key}`);
        }
        
        if (devEmail && devRole === 'student') {
          console.log('DEVELOPMENT MODE: Fetching groups for student:', devEmail);
          
          // Use our new localStorage database helper to get student groups directly
          const studentGroups = localDB.getStudentGroups(devEmail);
          console.log('Student groups from localDB:', studentGroups);
          
          // Add faculty name if not present
          const groupsWithFaculty = studentGroups.map((group: any) => {
            if (!group.faculty_name && group.faculty_id) {
              // Try to extract faculty name from localStorage
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('facultyGroups_')) {
                  const facultyEmail = key.replace('facultyGroups_', '');
                  return {
                    ...group,
                    faculty_name: facultyEmail.split('@')[0] // Simple extraction of name from email
                  };
                }
              }
            }
            return group;
          });
          
          setGroups(groupsWithFaculty);
          
          console.log(`Found ${groupsWithFaculty.length} groups for student:`, groupsWithFaculty);
          
          // Set the first group as selected by default
          if (groupsWithFaculty.length > 0) {
            setSelectedGroup(groupsWithFaculty[0]);
          } else {
            console.log('No groups found for this student');
            // Alert the user for debugging purposes
            alert(`No groups found for student: ${devEmail}
Check browser console for details.`);
          }
        } else if (user) {
          // In production mode, fetch groups from Supabase
          // import { getStudentGroups } from '@/lib/api/groups';
          // const studentGroups = await getStudentGroups(user.id);
          // setGroups(studentGroups);
          // if (studentGroups.length > 0) {
          //   setSelectedGroup(studentGroups[0]);
          // }
          
          // For now, we'll use the same localStorage approach
          // This would be replaced with the actual API call in production
        }
      } catch (error) {
        console.error('Error fetching student groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentGroups();
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
          
          // For now, we'll use localStorage to get group members
          const membersKey = `groupMembers_${selectedGroup.id}`;
          const storedMembers = localStorage.getItem(membersKey);
          
          console.log('Loading members for group:', selectedGroup.name, 'with key:', membersKey);
          console.log('Stored members data:', storedMembers);
          
          if (storedMembers) {
            const members = JSON.parse(storedMembers);
            console.log('Parsed members:', members);
            
            // Transform the data structure to match our GroupMember interface
            const groupMembers = members.map((member: any) => {
              console.log('Processing member:', member);
              const email = member.student?.email || '';
              
              // Get drive links for this student
              const driveLinks = localDB.getStudentDriveLinks(email, selectedGroup.id);
              
              return {
                id: member.student_id || member.id || '',
                name: member.student?.name || member.name || 'Unknown',
                usn: member.student?.usn || member.usn || '',
                group_usn: member.student?.group_usn || member.group_usn || '',
                class: member.student?.class || member.class || '',
                semester: member.student?.semester || member.semester || '',
                email: email,
                drive_links: driveLinks
              };
            });
            setGroupMembers(groupMembers);
            
            // Get current user's email
            const devEmail = localStorage.getItem('userEmail');
            if (devEmail) {
              setUserEmail(devEmail);
              
              // Get the current user's drive links
              const myLinks = localDB.getStudentDriveLinks(devEmail, selectedGroup.id);
              setMyDriveLinks(myLinks);
            }
          } else {
            setGroupMembers([]);
          }
        } catch (error) {
          console.error('Error fetching group members:', error);
          setGroupMembers([]);
        }
      }
    };
    
    fetchGroupMembers();
  }, [selectedGroup]);
  
  // Add a new drive link
  const handleAddDriveLink = async () => {
    if (!selectedGroup || !userEmail) return;
    
    // Validate the link
    if (!driveLink.trim()) {
      setError('Please enter a valid Google Drive link');
      return;
    }
    
    if (!driveLink.includes('drive.google.com')) {
      setError('Please enter a valid Google Drive link');
      return;
    }
    
    setIsUpdatingLink(true);
    
    try {
      // In a real implementation, we would use the API
      // import { addStudentDriveLink } from '@/lib/api/groups';
      // await addStudentDriveLink(userEmail, selectedGroup.id, driveLink, driveLinkDescription);
      
      // Use our localStorage database helper to add the drive link
      const result = localDB.addStudentDriveLink(userEmail, selectedGroup.id, driveLink, driveLinkDescription);
      
      if (result.success) {
        // Update the local state with the new links
        setMyDriveLinks(result.links);
        
        // Update the group members array to include the new link
        const updatedMembers = groupMembers.map(member => {
          if (member.email === userEmail) {
            return {
              ...member,
              drive_links: result.links
            };
          }
          return member;
        });
        
        setGroupMembers(updatedMembers);
        setIsLinkDialogOpen(false);
        setDriveLink('');
        setDriveLinkDescription('');
        setError(null);
      } else {
        setError(result.message || 'Failed to add drive link');
      }
    } catch (error) {
      console.error('Error adding drive link:', error);
      setError('Failed to add drive link. Please try again.');
    } finally {
      setIsUpdatingLink(false);
    }
  };
  
  // Remove a drive link
  const handleRemoveDriveLink = async (linkId: string) => {
    if (!selectedGroup || !userEmail) return;
    
    try {
      // In a real implementation, we would use the API
      // import { removeStudentDriveLink } from '@/lib/api/groups';
      // await removeStudentDriveLink(userEmail, selectedGroup.id, linkId);
      
      // Use our localStorage database helper to remove the drive link
      const result = localDB.removeStudentDriveLink(userEmail, selectedGroup.id, linkId);
      
      if (result.success) {
        // Update the local state with the new links
        setMyDriveLinks(result.links);
        
        // Update the group members array to include the new link
        const updatedMembers = groupMembers.map(member => {
          if (member.email === userEmail) {
            return {
              ...member,
              drive_links: result.links
            };
          }
          return member;
        });
        
        setGroupMembers(updatedMembers);
      } else {
        setError(result.message || 'Failed to remove drive link');
      }
    } catch (error) {
      console.error('Error removing drive link:', error);
      setError('Failed to remove drive link. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Groups</h1>
          <p className="text-gray-600 mt-1">View your assigned groups and team members</p>
        </div>
      </div>
      
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No Groups Assigned</h2>
          <p className="text-gray-600 mb-6">You haven't been assigned to any groups yet.</p>
          <p className="text-gray-500">Please contact your faculty if you believe this is an error.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Your Groups</CardTitle>
                <CardDescription>Select a group to view details</CardDescription>
              </CardHeader>
              <CardContent>
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
                      <div className="text-sm text-gray-500 mt-1">
                        Faculty: {group.faculty_name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {selectedGroup && (
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedGroup.name}</CardTitle>
                      <CardDescription>
                        Department: {selectedGroup.department} | PCL Group: {selectedGroup.pcl_group_no}
                      </CardDescription>
                    </div>
                    <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex items-center space-x-1"
                          disabled={myDriveLinks.length >= 5}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Add Drive Link {myDriveLinks.length >= 5 && '(Limit Reached)'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Google Drive Link</DialogTitle>
                          <DialogDescription>
                            Please provide a Google Drive link for your work. You can add up to 5 links.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="drive-link">Google Drive Link</Label>
                            <Input
                              id="drive-link"
                              value={driveLink}
                              onChange={(e) => setDriveLink(e.target.value)}
                              placeholder="https://drive.google.com/drive/folders/example"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="drive-link-description">Description (Optional)</Label>
                            <Input
                              id="drive-link-description"
                              value={driveLinkDescription}
                              onChange={(e) => setDriveLinkDescription(e.target.value)}
                              placeholder="E.g., Project documentation, Source code, etc."
                            />
                            {error && <p className="text-sm text-red-500">{error}</p>}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddDriveLink} disabled={isUpdatingLink}>
                            {isUpdatingLink ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 rounded-full border-t-transparent mr-2"></div>
                                Adding...
                              </>
                            ) : 'Add Link'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-blue-800">My Drive Links</h3>
                      <span className="text-xs text-gray-500">{myDriveLinks.length}/5 links</span>
                    </div>
                      
                      {myDriveLinks.length === 0 ? (
                        <p className="text-sm text-gray-600">You haven't added any drive links yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {myDriveLinks.map((link) => (
                            <div key={link.id} className="flex items-start justify-between bg-white p-3 rounded border border-blue-100">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <a 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm truncate"
                                  >
                                    {link.url}
                                  </a>
                                </div>
                                {link.description && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">{link.description}</p>
                                )}
                              </div>
                              <button 
                                onClick={() => handleRemoveDriveLink(link.id)}
                                className="ml-2 text-red-500 hover:text-red-700 p-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Group Members</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>USN</TableHead>
                          <TableHead>Group USN</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Semester</TableHead>
                          <TableHead>Drive Links</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.usn}</TableCell>
                            <TableCell>{member.group_usn}</TableCell>
                            <TableCell>{member.class}</TableCell>
                            <TableCell>{member.semester}</TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
