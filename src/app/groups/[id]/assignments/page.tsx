// src/app/groups/[id]/assignments/page.tsx
import GroupAssignmentsClientPage from './assignments-client';

interface ResolvedParams {
  id: string; // This 'id' is the groupId from the URL
}

export default async function GroupAssignmentsServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const groupId = params.id;

  return <GroupAssignmentsClientPage groupId={groupId} />;
}
