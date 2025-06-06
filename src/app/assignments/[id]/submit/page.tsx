"use server";

import SubmitAssignmentClientPage from './submit-client';

interface ResolvedParams {
  id: string;
}

export default async function SubmitAssignmentServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const assignmentId = params.id;

  return <SubmitAssignmentClientPage assignmentId={assignmentId} />;
}
