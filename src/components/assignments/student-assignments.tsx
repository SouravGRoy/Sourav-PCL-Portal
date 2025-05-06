import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getStudentAssignments } from '@/lib/api/assignments';
import { getStudentSubmissionForAssignment } from '@/lib/api/submissions';
import { Assignment } from '@/types';

export default function StudentAssignments() {
  const { user } = useUserStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submittedAssignments, setSubmittedAssignments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;
      
      try {
        // Fetch all assignments for the student
        const assignmentsData = await getStudentAssignments(user.id);
        setAssignments(assignmentsData);
        
        // Check which assignments have been submitted
        const submittedIds: string[] = [];
        for (const assignment of assignmentsData) {
          const submission = await getStudentSubmissionForAssignment(user.id, assignment.id);
          if (submission) {
            submittedIds.push(assignment.id);
          }
        }
        
        setSubmittedAssignments(submittedIds);
      } catch (err: any) {
        setError(err.message || 'Failed to load assignments');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignments();
  }, [user]);

  if (isLoading) {
    return <div className="text-center p-8">Loading assignments...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  // Separate assignments into pending and submitted
  const pendingAssignments = assignments.filter(a => !submittedAssignments.includes(a.id));
  const completedAssignments = assignments.filter(a => submittedAssignments.includes(a.id));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Assignments</h1>
      
      {assignments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">You don't have any assignments yet.</p>
          <p className="text-sm text-gray-400 mt-2">Join a group to get assignments.</p>
          <Button asChild className="mt-4">
            <a href="/groups/join">Join Groups</a>
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Assignments ({pendingAssignments.length})</h2>
            {pendingAssignments.length === 0 ? (
              <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">No pending assignments. Great job!</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingAssignments.map((assignment) => (
                  <Card key={assignment.id} className="border-l-4 border-l-yellow-400">
                    <CardHeader>
                      <CardTitle>{assignment.title}</CardTitle>
                      <CardDescription>
                        Due: {new Date(assignment.due_date).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-4">{assignment.description}</p>
                      <div className="flex space-x-2">
                        <Button asChild>
                          <a href={`/assignments/${assignment.id}/submit`}>Submit Assignment</a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/assignments/${assignment.id}`}>View Details</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Completed Assignments ({completedAssignments.length})</h2>
            {completedAssignments.length === 0 ? (
              <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">You haven't completed any assignments yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {completedAssignments.map((assignment) => (
                  <Card key={assignment.id} className="border-l-4 border-l-green-400">
                    <CardHeader>
                      <CardTitle>{assignment.title}</CardTitle>
                      <CardDescription>
                        Due: {new Date(assignment.due_date).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-4">{assignment.description}</p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/submissions/assignment/${assignment.id}`}>View Submission</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
