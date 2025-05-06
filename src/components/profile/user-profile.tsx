import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/lib/store';
import { getProfileById, updateProfile } from '@/lib/api/profiles';
import { UserProfile, StudentProfile, FacultyProfile } from '@/types';
import { supabase } from '@/lib/supabase';

export default function UserProfileComponent() {
  const { user, role } = useUserStore();
  const [profile, setProfile] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Student-specific fields
  const [usn, setUsn] = useState('');
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('');
  const [subjectCodes, setSubjectCodes] = useState('');
  
  // Faculty-specific fields
  const [department, setDepartment] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        // Fetch base profile
        const profileData = await getProfileById(user.id);
        setProfile(profileData);
        setName(profileData.name);
        
        // Fetch role-specific profile data
        if (role === 'student') {
          const { data: studentData } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (studentData) {
            setUsn(studentData.usn || '');
            setClassName(studentData.class || '');
            setSemester(studentData.semester || '');
            setSubjectCodes(studentData.subject_codes?.join(', ') || '');
          }
        } else if (role === 'faculty') {
          const { data: facultyData } = await supabase
            .from('faculty_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (facultyData) {
            setDepartment(facultyData.department || '');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, role]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Update base profile
      await updateProfile(user.id, { name });
      
      // Update role-specific profile
      if (role === 'student') {
        const { error } = await supabase
          .from('student_profiles')
          .update({
            usn,
            class: className,
            semester,
            subject_codes: subjectCodes.split(',').map(code => code.trim())
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else if (role === 'faculty') {
        const { error } = await supabase
          .from('faculty_profiles')
          .update({
            department
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
      
      setIsEditing(false);
      
      // Refresh profile data
      const updatedProfile = await getProfileById(user.id);
      setProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div className="text-center p-8">Profile not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
                disabled
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {role && role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Your student details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="usn">USN Number</Label>
                  <Input
                    id="usn"
                    value={usn}
                    onChange={(e) => setUsn(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="className">Class</Label>
                  <Input
                    id="className"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="subjectCodes">Subject Codes (comma-separated)</Label>
                  <Input
                    id="subjectCodes"
                    value={subjectCodes}
                    onChange={(e) => setSubjectCodes(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {role && role === 'faculty' && (
        <Card>
          <CardHeader>
            <CardTitle>Department Information</CardTitle>
            <CardDescription>Your faculty details</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>Manage your password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/profile/change-password">Change Password</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
