// src/app/groups/[id]/page.tsx
import GroupClientPage from "./group-client";
import { getGroupById, getGroupMembers } from "@/lib/api/groups";
import { Group, GroupMember } from "@/types"; // Assuming GroupMemberWithProfile includes student profile details

interface ResolvedParams {
  id: string;
}

export default async function GroupServerPage({
  params: paramsPromise,
}: {
  params: Promise<ResolvedParams>;
}) {
  const params = await paramsPromise;
  const groupId = params.id;

  let groupDetails: Group | null = null;
  let members: GroupMember[] = []; // Use GroupMemberWithProfile or similar detailed type

  try {
    groupDetails = await getGroupById(groupId);
  } catch (error) {
    console.error(`Failed to fetch group details for ${groupId}:`, error);
    // Optionally, you could redirect to a not-found page or show an error message
  }

  try {
    // Assuming getGroupMembers returns members with their profile information (name, email, etc.)
    const fetchedMembers = await getGroupMembers(groupId);
    if (fetchedMembers) {
      members = fetchedMembers as GroupMember[]; // Adjust type assertion as needed based on actual return type
    }
  } catch (error) {
    console.error(`Failed to fetch group members for ${groupId}:`, error);
  }

  // If groupDetails is null (e.g., group not found), you might want to handle this explicitly
  // For example, by rendering a 'Not Found' component or redirecting.
  // For now, we'll pass null and let the client component handle it.

  return (
    <GroupClientPage
      groupId={groupId}
      groupDetails={groupDetails}
      members={members}
    />
  );
}
