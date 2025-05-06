import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';
import { getAssignmentById } from '@/lib/api/assignments';
import { createSubmission, getStudentSubmissionForAssignment } from '@/lib/api/submissions';
import { Assignment } from '@/types';

interface SubmitAssignmentFormProps {
  assignmentId: string;
}

export default function SubmitAssignmentForm({ assignmentId }: SubmitAssignmentFormProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [url, setUrl] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      if (!assignmentId || !user) return;
      
      try {
        // Fetch assignment details
        const assignmentData = await getAssignmentById(assignmentId);
        setAssignment(assignmentData);
        
        // Check if student has already submitted
        const submission = await getStudentSubmissionForAssignment(user.id, assignmentId);
        if (submission) {
          setExistingSubmission(submission);
          setUrl(submission.url);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assignment details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignmentDetails();
  }, [assignmentId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        throw new Error('Please enter a valid URL');
      }

      await createSubmission({
        assignment_id: assignmentId,
        student_id: user.id,
        url,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      });
      
      router.push('/submissions');
    } catch (error: any) {
      setError(error.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading assignment details...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!assignment) {
    return <div className="text-center p-8">Assignment not found</div>;
  }

  const isPastDue = new Date(assignment.due_date) < new Date();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{existingSubmission ? 'Update Submission' : 'Submit Assignment'}</CardTitle>
        <CardDescription>
          {assignment.title} - Due: {new Date(assignment.due_date).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPastDue && !existingSubmission && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            Warning: This assignment is past its due date. Late submissions may not be accepted.
          </div>
        )}
        
        {existingSubmission && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
            You have already submitted this assignment on {new Date(existingSubmission.submitted_at).toLocaleString()}.
            You can update your submission below.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Submission URL (Google Drive, GitHub, etc.)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
