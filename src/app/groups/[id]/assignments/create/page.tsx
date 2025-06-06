// src/app/groups/[id]/assignments/create/page.tsx
import CreateGroupAssignmentClientPage from './create-assignment-client';

interface ResolvedParams {
  id: string; // This 'id' is the groupId from the URL
}

export default async function CreateGroupAssignmentServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const groupId = params.id;

  return <CreateGroupAssignmentClientPage groupId={groupId} />;
}
