"use client";

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/store';
import { getFacultyProfile } from '@/lib/api/profiles';
import { getGroupsByFaculty, getGroupCountByFaculty } from '@/lib/api/groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FacultyProfile } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { CalendarIcon, BookOpenIcon, UsersIcon, AcademicCapIcon, BriefcaseIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function EnhancedFacultyProfile() {
  const { user } = useUserStore();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [groupCount, setGroupCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sample data for skills - would be replaced with actual data from backend
  const [skills, setSkills] = useState([
    { name: 'NA', level: 0 },
    { name: 'NA', level: 0 },
    { name: 'NA', level: 0 },
  ]);

  // Sample data for publications - would be replaced with actual data from backend
  const [publications, setPublications] = useState([
    { title: 'NA', year: 0, journal: 'NA' },
    { title: 'NA', year: 0, journal: 'NA' },
  ]);

  // Stats data
  const statsData = [
    { name: 'Groups', value: groupCount },
    { name: 'Students', value: groupCount > 0 ? groupCount * 4 : 0 }, // Calculate based on groups or show 0
    { name: 'Papers', value: publications.length },
    { name: 'Years', value: 'NA' }, // Using NA for static sample data
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        // Check for development mode using localStorage (consistent with login-form.tsx)
        const devEmail = localStorage.getItem('userEmail');
        const devRole = localStorage.getItem('userRole');
        
        if (devEmail && devRole === 'faculty') {
          // Check if we have stored profile data for this specific user
          const profileKey = `facultyProfile_${devEmail}`;
          const storedProfileData = localStorage.getItem(profileKey);
          
          if (storedProfileData) {
            try {
              // Use the stored profile data if available
              const parsedProfile = JSON.parse(storedProfileData);
              const mockProfile = {
                id: 'dev-faculty-id',
                email: devEmail,
                role: 'faculty' as const,
                name: parsedProfile.name || 'NA',
                department: parsedProfile.department || 'NA',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              setProfile(mockProfile as any);
              setName(mockProfile.name);
              setDepartment(mockProfile.department);
              setEmail(mockProfile.email);
              setGroupCount(3); // Mock group count for development
              console.log('Using stored profile data in dev mode:', mockProfile);
            } catch (e) {
              console.error('Error parsing stored profile data:', e);
              setError('Failed to parse stored profile data');
            }
          } else {
            // Create default mock profile
            const mockProfile = {
              id: 'dev-faculty-id',
              email: devEmail,
              role: 'faculty' as const,
              name: 'NA',
              department: 'NA',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setProfile(mockProfile as any);
            setName(mockProfile.name);
            setDepartment(mockProfile.department);
            setEmail(mockProfile.email);
            setGroupCount(3); // Mock group count for development
            console.log('Using default mock profile in dev mode:', mockProfile);
          }
          
          setIsLoading(false);
          return;
        }
        
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch faculty profile from Supabase database
        const profileData = await getFacultyProfile(user.id);
        
        if (profileData) {
          setProfile(profileData);
          setName(profileData.name || '');
          setDepartment(profileData.department || '');
          setEmail(profileData.email || '');
          
          // Fetch group count from database
          const count = await getGroupCountByFaculty(user.id);
          setGroupCount(count);
        }
      } catch (err: any) {
        console.error('Error fetching faculty profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Update faculty profile in the database
      const { error } = await fetch('/api/faculty-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name,
          department,
        }),
      }).then(res => res.json());
      
      if (error) throw new Error(error);
      
      // Update local state with new values
      setProfile(prev => prev ? { ...prev, name, department } : null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 bg-red-50 text-red-500 rounded-lg border border-red-200">{error}</div>;
  }

  if (!profile) {
    return <div className="p-8 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">Profile not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Section with Hero Banner */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
        <div className="relative z-10 px-8 py-16 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{name}</h1>
              <div className="flex items-center mb-4">
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                <span className="text-xl font-semibold">{department}</span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span>Faculty Member</span>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold border-4 border-white/50">
                  {name.charAt(0)}
                </div>
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/50"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="bg-white hover:bg-white/90 text-indigo-700"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="skills">Skills & Expertise</TabsTrigger>
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="groups">Research Groups</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
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
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value="Faculty"
                    disabled
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/profile/change-password">Change Password</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
              <CardDescription>Your academic and professional competencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {skills.map((skill, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{skill.name}</span>
                      <span>{skill.level}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Publications Tab */}
        <TabsContent value="publications">
          <Card>
            <CardHeader>
              <CardTitle>Academic Publications</CardTitle>
              <CardDescription>Your research papers and publications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {publications.map((publication, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                    <h3 className="font-semibold text-lg">{publication.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1 space-x-4">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{publication.year}</span>
                      </div>
                      <div className="flex items-center">
                        <BookOpenIcon className="h-4 w-4 mr-1" />
                        <span>{publication.journal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Groups Tab */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Research Groups</CardTitle>
              <CardDescription>Student groups under your guidance</CardDescription>
            </CardHeader>
            <CardContent>
              {groupCount > 0 ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Groups Overview</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Total Groups', value: groupCount },
                        { name: 'Active Projects', value: Math.ceil(groupCount * 0.8) },
                        { name: 'Completed Projects', value: Math.floor(groupCount * 0.2) },
                      ]}>
                        <XAxis dataKey="name" />  
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>View detailed group information on your dashboard</span>
                    <Button asChild>
                      <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Research Groups Yet</h3>
                  <p className="text-gray-500 mb-4">You haven't created any research groups yet.</p>
                  <Button asChild>
                    <a href="/dashboard">Create a Group</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
