"use server";

import AssignmentSubmissionsClientPage from './submissions-client';

interface ResolvedParams {
  id: string;
}

export default async function AssignmentSubmissionsServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const assignmentId = params.id;

  return <AssignmentSubmissionsClientPage assignmentId={assignmentId} />;
}
