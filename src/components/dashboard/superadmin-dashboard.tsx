import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getAllFaculty, getAllStudents } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';

export default function SuperAdminDashboard() {
  const { user } = useUserStore();
  const [facultyCount, setFacultyCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        // Fetch faculty count
        const faculty = await getAllFaculty();
        setFacultyCount(faculty.length);
        
        // Fetch student count
        const students = await getAllStudents();
        setStudentCount(students.length);
        
        // Fetch group count
        const { count: groups } = await supabase
          .from('groups')
          .select('*', { count: 'exact', head: true });
        
        setGroupCount(groups || 0);
        
        // Fetch submission count
        const { count: submissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true });
        
        setSubmissionCount(submissions || 0);
      } catch (err: any) {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Welcome, Super Admin</CardTitle>
          <CardDescription>System-wide statistics and management</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Faculty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{facultyCount}</p>
            <p className="text-sm text-gray-500">Registered faculty members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{studentCount}</p>
            <p className="text-sm text-gray-500">Registered students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{groupCount}</p>
            <p className="text-sm text-gray-500">Total groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{submissionCount}</p>
            <p className="text-sm text-gray-500">Total submissions</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Administrative Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/faculty/manage" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100">
            <h3 className="font-medium">Manage Faculty</h3>
            <p className="text-sm text-gray-500">Add, edit, or remove faculty members</p>
          </a>
          <a href="/stats" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100">
            <h3 className="font-medium">System Statistics</h3>
            <p className="text-sm text-gray-500">View detailed system statistics</p>
          </a>
        </div>
      </div>
    </div>
  );
}
