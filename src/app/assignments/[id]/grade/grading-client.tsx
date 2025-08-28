"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import GradingSystem from "@/components/assignments/grading-system";
import { getAssignmentDetails } from "@/lib/api/assignments";
import { useUserStore } from "@/lib/store";

interface GradingPageClientProps {
  assignmentId: string;
}

export default function GradingPageClient({
  assignmentId,
}: GradingPageClientProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const [assignmentDetails, setAssignmentDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      try {
        setLoading(true);
        const details = await getAssignmentDetails(assignmentId);
        setAssignmentDetails(details);
      } catch (error) {
        console.error("Error fetching assignment details:", error);
        setError("Failed to load assignment details");
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  // Redirect if not faculty
  useEffect(() => {
    if (user && role !== "faculty") {
      router.push("/dashboard");
    }
  }, [user, role, router]);

  const handleBack = () => {
    router.back(); // Go back to the previous page
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !assignmentDetails) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Assignment Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              {error || "Assignment details could not be loaded."}
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <GradingSystem assignment={assignmentDetails} onBack={handleBack} />
    </MainLayout>
  );
}
