// src/app/groups/[id]/page.tsx
import GroupClientPage from './group-client';

interface ResolvedParams {
  id: string;
}

export default async function GroupServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const groupId = params.id;

  return <GroupClientPage groupId={groupId} />;
}
