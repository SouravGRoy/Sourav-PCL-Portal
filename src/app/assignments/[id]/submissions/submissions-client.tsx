"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import FacultySubmissionsList from "@/components/submissions/faculty-submissions-list";
import { useUserStore } from "@/lib/store";

interface SubmissionsClientProps {
  assignmentId: string;
}

export default function AssignmentSubmissionsClientPage({ assignmentId }: SubmissionsClientProps) {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (role !== "faculty") {
      // Redirect if not a faculty - consider a more specific unauthorized page or back
      router.push("/dashboard"); 
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Submissions for Assignment</h1>
        <FacultySubmissionsList assignmentId={assignmentId} />
      </div>
    </MainLayout>
  );
}
