import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/lib/store';
import { getAllFaculty } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { FacultyProfile } from '@/types';

export default function FacultyManagement() {
  const { user } = useUserStore();
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New faculty form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFacultyEmail, setNewFacultyEmail] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newFacultyDepartment, setNewFacultyDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaculty = async () => {
      if (!user) return;
      
      try {
        const facultyData = await getAllFaculty();
        setFaculty(facultyData);
      } catch (err: any) {
        setError(err.message || 'Failed to load faculty data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFaculty();
  }, [user]);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Validate email domain
      if (!newFacultyEmail.endsWith('@jainuniversity.ac.in')) {
        throw new Error('Only @jainuniversity.ac.in email addresses are allowed');
      }

      // Generate a random password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newFacultyEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: 'faculty' }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Create faculty profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: newFacultyEmail,
            name: newFacultyName,
            role: 'faculty',
            created_at: new Date().toISOString()
          });
        
        if (profileError) throw profileError;
        
        // Create faculty-specific profile
        const { error: facultyProfileError } = await supabase
          .from('faculty_profiles')
          .insert({
            user_id: authData.user.id,
            department: newFacultyDepartment
          });
        
        if (facultyProfileError) throw facultyProfileError;
        
        // Refresh the faculty list
        const facultyData = await getAllFaculty();
        setFaculty(facultyData);
        
        // Reset form and close dialog
        setNewFacultyEmail('');
        setNewFacultyName('');
        setNewFacultyDepartment('');
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to add faculty member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFaculty = async (facultyId: string) => {
    if (!confirm('Are you sure you want to remove this faculty member? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete faculty-specific profile
      const { error: facultyProfileError } = await supabase
        .from('faculty_profiles')
        .delete()
        .eq('user_id', facultyId);
      
      if (facultyProfileError) throw facultyProfileError;
      
      // Delete base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', facultyId);
      
      if (profileError) throw profileError;
      
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(facultyId);
      
      if (authError) throw authError;
      
      // Update the faculty list
      setFaculty(faculty.filter(f => f.id !== facultyId));
    } catch (error: any) {
      setError(error.message || 'Failed to remove faculty member');
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading faculty data...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Faculty Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Faculty</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Faculty</DialogTitle>
              <DialogDescription>
                Create a new faculty account. The faculty member will receive an email to set their password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFaculty} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="faculty@jainuniversity.ac.in"
                  value={newFacultyEmail}
                  onChange={(e) => setNewFacultyEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newFacultyDepartment}
                  onChange={(e) => setNewFacultyDepartment(e.target.value)}
                  required
                />
              </div>
              {formError && <div className="text-sm text-red-500">{formError}</div>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Faculty'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {faculty.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No faculty members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculty.map((facultyMember) => (
            <Card key={facultyMember.id}>
              <CardHeader>
                <CardTitle>{facultyMember.name}</CardTitle>
                <CardDescription>{facultyMember.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">Department: {facultyMember.department}</p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/faculty/${facultyMember.id}`}>View Details</a>
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveFaculty(facultyMember.id)}>
                    Remove
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
