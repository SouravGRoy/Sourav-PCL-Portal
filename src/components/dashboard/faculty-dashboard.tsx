import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getFacultyProfile, getStudentCount } from '@/lib/api/profiles';
import { getGroupsByFaculty, getGroupCountByFaculty } from '@/lib/api/groups';
import { getFacultyAssignments } from '@/lib/api/assignments';
import { FacultyProfile } from '@/types';
import Link from 'next/link';

export default function FacultyDashboard() {
  // Force component refresh function
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setRefreshKey(prev => prev + 1);
  };
  const { user } = useUserStore();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This will re-run when refreshKey changes
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        console.log('Starting to fetch dashboard data');
        
        // If no user is found, check for development mode
        if (!user) {
          console.log('No user found, checking for development mode');
          const devEmail = localStorage.getItem('userEmail');
          const devRole = localStorage.getItem('userRole');
          
          if (devEmail && devRole === 'faculty') {
            console.log('DEVELOPMENT MODE: Using stored email for faculty dashboard:', devEmail);
            
            // Check if we have stored profile data for this specific user
            const profileKey = `facultyProfile_${devEmail}`;
            const storedProfileData = localStorage.getItem(profileKey);
            let mockProfile;
            
            if (storedProfileData) {
              // Use the stored profile data if available
              const parsedProfile = JSON.parse(storedProfileData);
              const baseProfile = {
                id: 'dev-faculty-id',
                email: devEmail,
                role: 'faculty' as const,
                name: 'Development Faculty', // Add name to base profile
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              mockProfile = {
                ...baseProfile,
                ...parsedProfile,
                name: parsedProfile.name || baseProfile.name, // Use name from faculty_profiles table with fallback
                department: parsedProfile.department || 'Department' // Ensure department is never null/undefined
              } as FacultyProfile;
              console.log('Final profile being returned:', mockProfile);
              console.log('Using stored profile data:', mockProfile);
            } else {
              // Create default mock faculty profile data
              const baseProfile = {
                id: 'dev-faculty-id',
                email: devEmail,
                role: 'faculty' as const,
                name: 'Development Faculty',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              mockProfile = {
                ...baseProfile,
                name: 'Development Faculty',
                department: 'Computer Science'
              } as FacultyProfile;
              console.log('Using default mock profile data:', mockProfile);
            }
            
            console.log('Setting profile in dev mode:', mockProfile);
            setProfile(mockProfile);
            
            // Set mock data for development mode
            setGroupCount(3);
            setStudentCount(12);
            setAssignmentCount(0); // Marked as under development
            setIsLoading(false);
            return;
          }
          setIsLoading(false);
          return;
        }
        
        // Fetch faculty profile with forced refresh
        console.log('Fetching faculty profile for user ID:', user.id);
        // Add timestamp to force fresh data
        const forceRefresh = new Date().getTime();
        console.log('Force refresh timestamp:', forceRefresh);
        const profileData = await getFacultyProfile(user.id);
        console.log('Profile data received:', profileData);
        
        if (profileData) {
          console.log('Faculty profile found:', profileData);
          
          // Show exactly what's in the database without fallbacks for debugging
          console.log('DEBUGGING - RAW NAME FROM DB:', profileData.name);
          console.log('DEBUGGING - RAW NAME TYPE:', typeof profileData.name);
          console.log('DEBUGGING - RAW DEPARTMENT FROM DB:', profileData.department);
          
          const baseProfile = {
            id: user.id,
            email: user.email || '',
            role: 'faculty' as const,
            name: profileData.name, // Use raw name from database - NO FALLBACK
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const resultProfile = {
            ...baseProfile,
            ...profileData,
            // No fallbacks to see the raw values
          } as FacultyProfile;
          console.log('Final profile being returned:', resultProfile);
          setProfile(resultProfile);
        } else {
          console.warn('No profile data returned, using default values');
          // Create a default profile if none is found
          const baseProfile = {
            id: user.id,
            email: user.email || '',
            role: 'faculty' as const,
            name: 'Faculty Member', // Add name to base profile
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const defaultProfile = {
            ...baseProfile,
            name: 'Faculty Member',
            department: 'Department'
          } as FacultyProfile;
          console.log('Setting default profile:', defaultProfile);
          setProfile(defaultProfile);
        }
        
        // Fetch real data for groups and students
        try {
          // Get actual group count for this faculty
          if (user) {
            const actualGroupCount = await getGroupCountByFaculty(user.id);
            setGroupCount(actualGroupCount);
            console.log('Actual group count:', actualGroupCount);
          }
          
          // Get actual student count
          const actualStudentCount = await getStudentCount();
          setStudentCount(actualStudentCount);
          console.log('Actual student count:', actualStudentCount);
          
          // Assignment count - marked as under development
          setAssignmentCount(0);
        } catch (countError) {
          console.error('Error fetching counts:', countError);
          // Fallback to default values if counts fail
          setGroupCount(0);
          setStudentCount(0);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user, refreshKey]); // Add refreshKey as a dependency

  // Check if we have a profile in localStorage as a fallback
  useEffect(() => {
    if (!profile && !isLoading) {
      console.log('No profile found, checking localStorage...');
      const lastCreatedProfile = localStorage.getItem('lastCreatedProfile');
      
      if (lastCreatedProfile) {
        try {
          const parsedProfile = JSON.parse(lastCreatedProfile);
          console.log('Found profile in localStorage:', parsedProfile);
          
          // Create a profile object from localStorage data
          const localProfile = {
            id: parsedProfile.id || 'temp-id',
            email: user?.email || 'faculty@example.com',
            name: parsedProfile.name || 'Faculty Member',
            role: 'faculty',
            department: parsedProfile.department || 'Department',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('Setting profile from localStorage:', localProfile);
          setProfile(localProfile as any);
        } catch (e) {
          console.error('Error parsing profile from localStorage:', e);
        }
      }
    }
  }, [profile, isLoading, user]);
  
  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }
  
  // Only use profile data that comes directly from the database
  // Do NOT use default values except as a last resort
  const displayProfile = {
    name: profile?.name || 'Faculty Member',
    department: profile?.department || 'Department',
    role: 'faculty',
    id: user?.id || 'default-id',
    email: user?.email || 'faculty@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header with responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </Button>
          <a href="/profile/complete" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </a>
        </div>
      </div>
      
      {/* Welcome card with profile info */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl md:text-2xl text-indigo-900">Welcome, {displayProfile.name}</CardTitle>
          <CardDescription className="text-indigo-700">Department: {displayProfile.department}</CardDescription>
        </CardHeader>
      </Card>
      
      {/* Stats cards with responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-blue-100 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900">{groupCount}</p>
            <p className="text-sm text-blue-700">Created research groups</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-purple-100 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-purple-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-900">{studentCount}</p>
            <p className="text-sm text-purple-700">Total university students</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-yellow-100 hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-yellow-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-yellow-600">Under Development</p>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Coming Soon</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">Assignment management features</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick actions section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/groups/manage" className="group block p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Manage Groups</h3>
            </div>
            <p className="text-sm text-gray-500">Create and manage research groups for students</p>
          </Link>
          
          <Link href="/groups/submissions" className="group block p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">View Submissions</h3>
            </div>
            <p className="text-sm text-gray-500">Review and grade student group submissions</p>
          </Link>
          
          <a href="/profile" className="group block p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Faculty Profile</h3>
            </div>
            <p className="text-sm text-gray-500">View and update your faculty profile information</p>
          </a>
        </div>
      </div>
    </div>
  );
}
