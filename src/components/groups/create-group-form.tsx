import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { createGroup } from '@/lib/api/groups';

interface CreateGroupFormProps {
  onSuccess?: () => void;
}

export default function CreateGroupForm({ onSuccess }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [pclGroupNo, setPclGroupNo] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { user } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate required fields
    if (!name) {
      setError('Group name is required');
      setIsLoading(false);
      return;
    }

    if (!department) {
      setError('Department is required');
      setIsLoading(false);
      return;
    }

    if (!pclGroupNo) {
      setError('PCL Group Number is required');
      setIsLoading(false);
      return;
    }

    try {
      if (!user) {
        console.error('No user found in store when trying to create group');
        throw new Error('User not authenticated');
      }

      console.log('Creating group with faculty ID:', user.id);
      
      // Create the group in Supabase with all required fields
      await createGroup({
        name,
        department,
        pcl_group_no: pclGroupNo,
        description,
        faculty_id: user.id,
      });
      
      console.log('Group created successfully');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      router.push('/groups');
    } catch (error: any) {
      console.error('Error creating group:', error);
      setError(error.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New Group</CardTitle>
        <CardDescription>Create a new group for your students</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Enter department name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pcl-group-no">PCL Group Number *</Label>
            <Input
              id="pcl-group-no"
              value={pclGroupNo}
              onChange={(e) => setPclGroupNo(e.target.value)}
              placeholder="Enter PCL group number"
              disabled={isLoading}
            />
          </div>



          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
