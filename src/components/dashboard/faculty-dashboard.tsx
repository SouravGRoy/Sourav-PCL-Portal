import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { getFacultyProfile } from '@/lib/api/profiles';
import { getGroupsByFaculty } from '@/lib/api/groups';
import { getFacultyAssignments } from '@/lib/api/assignments';
import { FacultyProfile } from '@/types';
import { supabase } from '@/lib/supabase';

export default function FacultyDashboard() {
  const { user } = useUserStore();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // DEVELOPMENT MODE: Check for stored email
        const devEmail = localStorage.getItem('userEmail');
        const devRole = localStorage.getItem('userRole');
        
        if (devEmail && devRole === 'faculty') {
          console.log('DEVELOPMENT MODE: Using stored email for faculty dashboard:', devEmail);
          
          // Check if we have stored profile data from the form for this specific user
          const profileKey = `facultyProfile_${devEmail}`;
          const storedProfileData = localStorage.getItem(profileKey);
          let mockProfile;
          
          if (storedProfileData) {
            // Use the stored profile data if available
            const parsedProfile = JSON.parse(storedProfileData);
            mockProfile = {
              id: 'dev-faculty-id',
              email: devEmail,
              role: 'faculty',
              name: parsedProfile.name || 'Development Faculty',
              department: parsedProfile.department || 'Computer Science',
              created_at: new Date().toISOString()
            };
          } else {
            // Create default mock faculty profile data
            mockProfile = {
              id: 'dev-faculty-id',
              email: devEmail,
              name: 'Development Faculty',
              role: 'faculty',
              department: 'Computer Science',
              created_at: new Date().toISOString()
            };
          }
          
          setProfile(mockProfile as any);
          setGroupCount(3);
          setStudentCount(45);
          setAssignmentCount(8);
          setIsLoading(false);
          return;
        }
        
        // Normal flow for authenticated users
        if (!user) return;
        
        // Fetch faculty profile
        const profileData = await getFacultyProfile(user.id);
        setProfile(profileData);
        
        // Fetch groups
        const groups = await getGroupsByFaculty(user.id);
        setGroupCount(groups.length);
        
        // Count students in all groups
        let totalStudents = 0;
        for (const group of groups) {
          const { data, error } = await supabase
            .from('group_members')
            .select('student_id')
            .eq('group_id', group.id);
          
          if (!error && data) {
            // Count unique students
            const uniqueStudents = new Set(data.map(member => member.student_id));
            totalStudents += uniqueStudents.size;
          }
        }
        setStudentCount(totalStudents);
        
        // Fetch assignments
        const assignments = await getFacultyAssignments(user.id);
        setAssignmentCount(assignments.length);
      } catch (err: any) {
        console.error('Error loading faculty dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Complete Profile Button - Only in development mode for testing */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <a href="/profile/complete" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Complete/Edit Profile
        </a>
      </div>
      
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile.name}</CardTitle>
            <CardDescription>Department: {profile.department}</CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{groupCount}</p>
            <p className="text-sm text-gray-500">Created groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{studentCount}</p>
            <p className="text-sm text-gray-500">Total students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assignmentCount}</p>
            <p className="text-sm text-gray-500">Created assignments</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/groups/manage" className="group block p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-blue-700 transition-colors">Manage Groups</h3>
            <p className="text-sm text-gray-600">Create and manage student groups</p>
          </a>
          
          <a href="/assignments/create" className="group block p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-green-700 transition-colors">Create Assignment</h3>
            <p className="text-sm text-gray-600">Add a new assignment for students</p>
          </a>
          
          <a href="/submissions/review" className="group block p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-purple-700 transition-colors">Review Submissions</h3>
            <p className="text-sm text-gray-600">Review and grade student submissions</p>
          </a>
        </div>
      </div>
    </div>
  );
}
