import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getGroupsByFaculty } from '@/lib/api/groups';
import { Group } from '@/types';

export default function GroupList() {
  const { user } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      try {
        const groupsData = await getGroupsByFaculty(user.id);
        setGroups(groupsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
  }, [user]);

  if (isLoading) {
    return <div className="text-center p-8">Loading groups...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Groups</h1>
        <Button asChild>
          <a href="/groups/create">Create New Group</a>
        </Button>
      </div>
      
      {groups.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">You haven't created any groups yet.</p>
          <Button asChild className="mt-4">
            <a href="/groups/create">Create Your First Group</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>Created: {new Date(group.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">{group.description}</p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/groups/${group.id}`}>View Details</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/groups/${group.id}/assignments`}>Assignments</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
