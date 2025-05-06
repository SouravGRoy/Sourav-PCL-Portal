import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { getSubmissionById, provideFeedback } from '@/lib/api/submissions';
import { getAssignmentById } from '@/lib/api/assignments';
import { supabase } from '@/lib/supabase';

interface SubmissionFeedbackFormProps {
  submissionId: string;
}

export default function SubmissionFeedbackForm({ submissionId }: SubmissionFeedbackFormProps) {
  const [submission, setSubmission] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [studentName, setStudentName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      if (!submissionId) return;
      
      try {
        // Fetch submission details
        const submissionData = await getSubmissionById(submissionId);
        setSubmission(submissionData);
        setFeedback(submissionData.feedback || '');
        
        // Fetch assignment details
        const assignmentData = await getAssignmentById(submissionData.assignment_id);
        setAssignment(assignmentData);
        
        // Fetch student name
        const { data: studentData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', submissionData.student_id)
          .single();
        
        if (studentData) {
          setStudentName(studentData.name);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load submission details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmissionDetails();
  }, [submissionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!submission) {
        throw new Error('Submission not found');
      }

      await provideFeedback(submissionId, feedback);
      
      router.push(`/assignments/${submission.assignment_id}/submissions`);
    } catch (error: any) {
      setError(error.message || 'Failed to provide feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading submission details...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!submission || !assignment) {
    return <div className="text-center p-8">Submission not found</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Review Submission</CardTitle>
        <CardDescription>
          {assignment.title} - Submitted by {studentName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Submission Details</h3>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-sm font-medium">Submitted On:</p>
                <p className="text-sm text-gray-600">{new Date(submission.submitted_at).toLocaleString()}</p>
              </div>
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
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <textarea
                id="feedback"
                className="w-full p-2 border rounded-md min-h-[150px]"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : submission.status === 'reviewed' ? 'Update Feedback' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
