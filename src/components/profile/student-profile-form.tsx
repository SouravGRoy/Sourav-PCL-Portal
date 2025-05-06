import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { createStudentProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';

export default function StudentProfileForm() {
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [groupUsn, setGroupUsn] = useState('');
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('');
  const [subjectCodes, setSubjectCodes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  
  const router = useRouter();
  const { user, setRole } = useUserStore();

  useEffect(() => {
    // Get the current authenticated user from Supabase directly
    const fetchUser = async () => {
      // DEVELOPMENT MODE: Check for stored email first
      const devEmail = localStorage.getItem('userEmail');
      
      if (devEmail) {
        console.log('DEVELOPMENT MODE: Using stored email for profile:', devEmail);
        // Create a mock user for development
        setSupabaseUser({
          id: 'dev-user-id',
          email: devEmail,
        } as any);
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setSupabaseUser(user);
        } else {
          // If no user is found, redirect to login
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Authentication error. Please try logging in again.');
      }
    };

    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // DEVELOPMENT MODE: Check if we're in development mode
      const devEmail = localStorage.getItem('userEmail');
      if (devEmail) {
        console.log('DEVELOPMENT MODE: Simulating profile creation');
        // Simulate successful profile creation
        setTimeout(() => {
          // Store profile data in localStorage for development mode with email as key
          const profileKey = `studentProfile_${devEmail}`;
          localStorage.setItem(profileKey, JSON.stringify({
            name,
            usn,
            group_usn: groupUsn,
            class: className,
            semester,
            subject_codes: subjectCodes.split(',').map(code => code.trim()),
          }));
          
          // Set role and redirect
          setRole('student');
          router.push('/dashboard/student');
        }, 1000);
        return;
      }
      
      // PRODUCTION MODE: Normal flow
      // Use the Supabase user ID directly instead of the store user
      if (!supabaseUser) {
        throw new Error('User not authenticated');
      }

      console.log('Creating student profile with user ID:', supabaseUser.id);
      
      // Check if the user already exists in the profiles table
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
        console.error('Error checking existing profile:', profileError);
      }

      console.log('Existing profile check result:', existingProfile);
      
      try {
        await createStudentProfile({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name,
          usn,
          group_usn: groupUsn,
          class: className,
          semester,
          subject_codes: subjectCodes.split(',').map(code => code.trim()),
          created_at: new Date().toISOString(),
        });
        
        setRole('student');
        router.push('/dashboard/student');
      } catch (profileCreationError: any) {
        console.error('Detailed profile creation error:', profileCreationError);
        
        // If there's a foreign key constraint error, it might be because the auth user doesn't exist
        // Let's try to handle this case by showing a more helpful error message
        if (profileCreationError.message && profileCreationError.message.includes('foreign key constraint')) {
          setError('There was an issue with your account. Please try logging out and logging in again.');
        } else {
          throw profileCreationError;
        }
      }
    } catch (error: any) {
      console.error('Profile creation error:', error);
      setError(error.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Complete Your Student Profile</CardTitle>
        <CardDescription className="text-blue-100">Please provide your academic details to continue</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="usn" className="text-sm font-medium">USN Number</Label>
              <Input
                id="usn"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="1JA21CS001"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="groupUsn" className="text-sm font-medium">Group USN Number</Label>
            <Input
              id="groupUsn"
              value={groupUsn}
              onChange={(e) => setGroupUsn(e.target.value)}
              className="transition-all focus:ring-2 focus:ring-blue-500"
              placeholder="G1JA21CS001"
              required
            />
            <p className="text-xs text-gray-500">This is your group identifier for team assignments</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="className" className="text-sm font-medium">Class</Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="CSE-A"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="semester" className="text-sm font-medium">Semester</Label>
              <Input
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="3"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subjectCodes" className="text-sm font-medium">Subject Codes</Label>
            <Input
              id="subjectCodes"
              value={subjectCodes}
              onChange={(e) => setSubjectCodes(e.target.value)}
              className="transition-all focus:ring-2 focus:ring-blue-500"
              placeholder="CS101, CS102, CS103"
              required
            />
            <p className="text-xs text-gray-500">Enter comma-separated subject codes you're enrolled in</p>
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Profile...
              </>
            ) : 'Complete Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
