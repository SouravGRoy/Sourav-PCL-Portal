"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import EnhancedStudentAssignments from "@/components/assignments/enhanced-student-assignments";
import { useUserStore } from "@/lib/store";

export default function AssignmentsPage() {
  const router = useRouter();
  const { user, role } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEVELOPMENT MODE: Check for stored role
    const devRole = localStorage.getItem("userRole");

    if (devRole === "student" || devRole === "faculty") {
      setLoading(false);
      return;
    }

    // Normal authentication flow
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(false);
  }, [user, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </MainLayout>
    );
  }

  // Get current role (either from auth or dev mode)
  const currentRole = role || localStorage.getItem("userRole");

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {currentRole === "student" ? (
          <EnhancedStudentAssignments />
        ) : currentRole === "faculty" ? (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Faculty Assignment Management
              </h1>
              <p className="text-gray-600">
                Create, manage, and grade student assignments
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Faculty assignment management is available. Please select a
                group from your dashboard to manage assignments.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg shadow-xl p-8 mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Assignments</h1>
            <p className="text-indigo-100">
              Please log in to access assignments for your role
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
