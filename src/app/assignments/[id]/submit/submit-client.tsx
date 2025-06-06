"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import SubmitAssignmentForm from "@/components/assignments/submit-assignment-form";
import { useUserStore } from "@/lib/store";

interface SubmitClientProps {
  assignmentId: string;
}

export default function SubmitAssignmentClientPage({ assignmentId }: SubmitClientProps) {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (role !== "student") {
      // Redirect if not a student - consider a more specific unauthorized page or back
      router.push("/dashboard"); 
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <div className="max-w-md mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Submit Assignment</h1>
        <SubmitAssignmentForm assignmentId={assignmentId} />
      </div>
    </MainLayout>
  );
}
