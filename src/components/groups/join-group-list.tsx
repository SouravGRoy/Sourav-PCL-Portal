import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { addStudentToGroup } from '@/lib/api/groups';
import { Group } from '@/types';
import Link from 'next/link';

export default function JoinGroupList() {
  const { user } = useUserStore();
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      try {
        // Get all groups
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('*');
        
        if (groupsError) throw groupsError;
        
        // Get groups the student has already joined
        const { data: memberships, error: membershipsError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('student_id', user.id);
        
        if (membershipsError) throw membershipsError;
        
        const joinedGroupIds = memberships.map(m => m.group_id);
        setJoinedGroups(joinedGroupIds);
        
        // Filter out groups the student has already joined
        setAvailableGroups(groups.filter(group => !joinedGroupIds.includes(group.id)));
      } catch (err: any) {
        setError(err.message || 'Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
  }, [user]);

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    
    setJoinLoading(groupId);
    
    try {
      await addStudentToGroup(groupId, user.id);
      
      // Update the lists
      setJoinedGroups([...joinedGroups, groupId]);
      setAvailableGroups(availableGroups.filter(group => group.id !== groupId));
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setJoinLoading(null);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading groups...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Join Groups</h1>
      
      {availableGroups.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No available groups to join.</p>
          <p className="text-sm text-gray-400 mt-2">You&apos;ve joined all available groups or there are no groups created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  Faculty: {group.faculty_id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">{group.description}</p>
                <Button 
                  onClick={() => handleJoinGroup(group.id)} 
                  disabled={joinLoading === group.id}
                >
                  {joinLoading === group.id ? 'Joining...' : 'Join Group'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {joinedGroups.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Joined Groups</h2>
          <Button asChild variant="outline">
            <Link href="/groups/my">View My Groups</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
