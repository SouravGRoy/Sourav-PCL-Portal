// src/app/assignments/[id]/page.tsx
import { getAssignmentById } from '@/lib/api/assignments';
import AssignmentClient from '../assignment-client';
import { Assignment } from '@/types';
import { notFound } from 'next/navigation';

// Define the shape of the resolved params
interface ResolvedParams {
  id: string;
}

// The page component receives params which is a Promise in Next.js 15+
// The type annotation for the prop should reflect this.
export default async function AssignmentPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise; // Await the promise to get the actual params
  const assignmentId = params.id;

  const assignment: Assignment | null = await getAssignmentById(assignmentId);

  if (!assignment) {
    notFound(); // If assignment not found, render Next.js 404 page
  }

  // initialAssignment is guaranteed to be non-null here due to the notFound() call above
  return <AssignmentClient assignmentId={assignmentId} initialAssignment={assignment} />;
}
