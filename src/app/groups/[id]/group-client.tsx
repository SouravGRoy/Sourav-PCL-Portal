"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import GroupDetail from "@/components/groups/group-detail";
import StudentGroupDetail from "@/components/groups/student-group-detail";
import { useUserStore } from "@/lib/store";
import { Group, GroupMember } from "@/types"; // Added import

interface GroupClientProps {
  groupId: string;
  groupDetails: Group | null;
  members: GroupMember[];
}

export default function GroupClientPage({
  groupId,
  groupDetails,
  members,
}: GroupClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, isLoading } = useUserStore();

  // Get the tab from URL search params
  const initialTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    console.log("🔍 Group Client - Auth state:", {
      user: !!user,
      role,
      isLoading,
    });
    // Only redirect if we're done loading and still no user
    if (!isLoading && !user) {
      console.log("🔄 Redirecting to login - no user after loading");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // Show loading for maximum 3 seconds, then render anyway
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingTimeout(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, []);

  // Show loading only if we don't have user data yet and haven't timed out
  if (isLoading && !user && !showLoadingTimeout) {
    console.log("⏳ Group Client - Still loading user state");
    return (
      <MainLayout>
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          Loading user data...
        </div>
      </MainLayout>
    );
  }

  // Check if groupDetails is null
  if (!groupDetails) {
    return (
      <MainLayout>
        <div className="text-center p-8">
          <div className="text-red-600 mb-4">Group not found</div>
          <p>The requested group could not be loaded.</p>
        </div>
      </MainLayout>
    );
  }

  // Render based on user role
  console.log("🎯 Group Client - Rendering component based on role:", role);

  return (
    <MainLayout>
      {role === "faculty" ? (
        <GroupDetail
          groupId={groupId}
          groupDetails={groupDetails}
          members={members}
          initialTab={initialTab}
        />
      ) : (
        <StudentGroupDetail
          groupId={groupId}
          groupDetails={groupDetails}
          members={members}
          initialTab={initialTab}
        />
      )}
    </MainLayout>
  );
}
