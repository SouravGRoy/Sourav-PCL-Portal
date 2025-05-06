import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getAssignmentSubmissions } from '@/lib/api/submissions';
import { getAssignmentById } from '@/lib/api/assignments';
import { Assignment } from '@/types';

interface FacultySubmissionsListProps {
  assignmentId: string;
}

export default function FacultySubmissionsList({ assignmentId }: FacultySubmissionsListProps) {
  const { user } = useUserStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!assignmentId) return;
      
      try {
        // Fetch assignment details
        const assignmentData = await getAssignmentById(assignmentId);
        setAssignment(assignmentData);
        
        // Fetch all submissions for the assignment
        const submissionsData = await getAssignmentSubmissions(assignmentId);
        setSubmissions(submissionsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load submissions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmissions();
  }, [assignmentId]);

  if (isLoading) {
    return <div className="text-center p-8">Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{assignment?.title || 'Assignment'} Submissions</h1>
          <p className="text-gray-500">Due: {assignment ? new Date(assignment.due_date).toLocaleString() : 'Unknown'}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/groups/${assignment?.group_id}/assignments`}>Back to Assignments</a>
        </Button>
      </div>
      
      {submissions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No students have submitted this assignment yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-500">{submissions.length} submissions received</p>
          
          <div className="grid grid-cols-1 gap-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className={`border-l-4 ${submission.status === 'reviewed' ? 'border-l-green-400' : 'border-l-yellow-400'}`}>
                <CardHeader>
                  <CardTitle>{submission.profiles.name}</CardTitle>
                  <CardDescription>
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Submission URL:</p>
                      <a href={submission.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                        {submission.url}
                      </a>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Status:</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${submission.status === 'reviewed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {submission.status === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                      </span>
                    </div>
                    
                    {submission.status === 'reviewed' && submission.feedback && (
                      <div>
                        <p className="text-sm font-medium">Feedback:</p>
                        <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">{submission.feedback}</p>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button asChild>
                        <a href={`/submissions/${submission.id}/review`}>
                          {submission.status === 'reviewed' ? 'Edit Feedback' : 'Provide Feedback'}
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
