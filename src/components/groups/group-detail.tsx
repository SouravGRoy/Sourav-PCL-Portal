import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getGroupById, getGroupMembers, removeStudentFromGroup } from '@/lib/api/groups';
import { Group } from '@/types';

interface GroupDetailProps {
  groupId: string;
}

export default function GroupDetail({ groupId }: GroupDetailProps) {
  const { user, role } = useUserStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupId) return;
      
      try {
        // Fetch group details
        const groupData = await getGroupById(groupId);
        setGroup(groupData);
        
        // Fetch group members
        const membersData = await getGroupMembers(groupId);
        setMembers(membersData);
      } catch (err: any) {
        setError(err.message || 'Failed to load group details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [groupId]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!groupId) return;
    
    setRemoveLoading(studentId);
    
    try {
      await removeStudentFromGroup(groupId, studentId);
      
      // Update the members list
      setMembers(members.filter(member => member.student_id !== studentId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove student from group');
    } finally {
      setRemoveLoading(null);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading group details...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!group) {
    return <div className="text-center p-8">Group not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {role === 'faculty' && (
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <a href={`/groups/${groupId}/assignments/create`}>Add Assignment</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/groups/${groupId}/edit`}>Edit Group</a>
            </Button>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>Created: {new Date(group.created_at).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{group.description}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>{members.length} students in this group</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-gray-500">No students have joined this group yet.</p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium">{member.profiles.name}</p>
                    <p className="text-sm text-gray-500">{member.profiles.email}</p>
                  </div>
                  {role === 'faculty' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRemoveStudent(member.student_id)}
                      disabled={removeLoading === member.student_id}
                    >
                      {removeLoading === member.student_id ? 'Removing...' : 'Remove'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={`/groups/${groupId}/assignments`}>View Assignments</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
