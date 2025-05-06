import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function SystemStatistics() {
  const { user } = useUserStore();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalGroups: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    reviewedSubmissions: 0,
    submissionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user) return;
      
      try {
        // Fetch student count
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');
        
        // Fetch faculty count
        const { count: facultyCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'faculty');
        
        // Fetch group count
        const { count: groupCount } = await supabase
          .from('groups')
          .select('*', { count: 'exact', head: true });
        
        // Fetch assignment count
        const { count: assignmentCount } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true });
        
        // Fetch submission counts
        const { count: totalSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true });
        
        // Fetch pending submission count
        const { count: pendingSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        // Fetch reviewed submission count
        const { count: reviewedSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'reviewed');
        
        // Calculate submission rate
        let submissionRate = 0;
        if (assignmentCount && assignmentCount > 0 && studentCount && studentCount > 0) {
          // Theoretical maximum submissions = assignments * students
          const maxPossibleSubmissions = assignmentCount * studentCount;
          submissionRate = (totalSubmissions || 0) / maxPossibleSubmissions * 100;
        }
        
        setStats({
          totalStudents: studentCount || 0,
          totalFaculty: facultyCount || 0,
          totalGroups: groupCount || 0,
          totalAssignments: assignmentCount || 0,
          totalSubmissions: totalSubmissions || 0,
          pendingSubmissions: pendingSubmissions || 0,
          reviewedSubmissions: reviewedSubmissions || 0,
          submissionRate: Math.round(submissionRate * 10) / 10, // Round to 1 decimal place
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatistics();
  }, [user]);

  if (isLoading) {
    return <div className="text-center p-8">Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Statistics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalStudents}</p>
            <p className="text-sm text-gray-500">Registered students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Faculty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalFaculty}</p>
            <p className="text-sm text-gray-500">Faculty members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalGroups}</p>
            <p className="text-sm text-gray-500">Active groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalAssignments}</p>
            <p className="text-sm text-gray-500">Created assignments</p>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mt-8">Submission Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSubmissions}</p>
            <p className="text-sm text-gray-500">Total submissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pendingSubmissions}</p>
            <p className="text-sm text-gray-500">Pending review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.reviewedSubmissions}</p>
            <p className="text-sm text-gray-500">Reviewed submissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Submission Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.submissionRate}%</p>
            <p className="text-sm text-gray-500">Of possible submissions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
