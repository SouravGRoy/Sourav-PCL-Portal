"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store';
import { getAssignmentById } from '@/lib/api/assignments';
import { getStudentSubmissionForAssignment } from '@/lib/api/submissions';
import { Assignment } from '@/types';

interface AssignmentPageProps {
  params: {
    id: string;
  };
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assignmentId = params.id;

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      if (!assignmentId || !user) return;
      
      try {
        // Fetch assignment details
        const assignmentData = await getAssignmentById(assignmentId);
        setAssignment(assignmentData);
        
        // Check if student has already submitted (only for students)
        if (role === 'student') {
          const submission = await getStudentSubmissionForAssignment(user.id, assignmentId);
          setHasSubmitted(!!submission);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assignment details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignmentDetails();
  }, [assignmentId, user, role]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="text-center p-8">Loading assignment details...</div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center p-8 text-red-500">{error}</div>
      </MainLayout>
    );
  }

  if (!assignment) {
    return (
      <MainLayout>
        <div className="text-center p-8">Assignment not found</div>
      </MainLayout>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          {role === 'faculty' && (
            <Button variant="outline" asChild>
              <a href={`/assignments/${assignmentId}/submissions`}>View Submissions</a>
            </Button>
          )}
          {role === 'student' && (
            <Button asChild disabled={isPastDue && !hasSubmitted}>
              <a href={`/assignments/${assignmentId}/submit`}>
                {hasSubmitted ? 'Update Submission' : 'Submit Assignment'}
              </a>
            </Button>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>
              Due: {new Date(assignment.due_date).toLocaleString()}
              {isPastDue && (
                <span className="ml-2 text-red-500">(Past Due)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{assignment.description}</p>
            </div>
          </CardContent>
        </Card>
        
        {role === 'student' && (
          <div className="mt-6">
            {hasSubmitted ? (
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-green-700">You have submitted this assignment.</p>
                  <div className="mt-4">
                    <Button variant="outline" asChild>
                      <a href="/submissions">View Your Submission</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className={isPastDue ? 'bg-red-50' : 'bg-yellow-50'}>
                <CardContent className="pt-6">
                  {isPastDue ? (
                    <p className="text-red-700">This assignment is past due. Late submissions may not be accepted.</p>
                  ) : (
                    <p className="text-yellow-700">You haven't submitted this assignment yet.</p>
                  )}
                  <div className="mt-4">
                    <Button asChild disabled={isPastDue}>
                      <a href={`/assignments/${assignmentId}/submit`}>Submit Now</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
