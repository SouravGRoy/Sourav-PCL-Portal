"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentProfileForm from "@/components/profile/student-profile-form";
import FacultyProfileForm from "@/components/profile/faculty-profile-form";
import { useUserStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function ProfileCompletion() {
  const router = useRouter();
  const { user, role, setUser, setRole } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If user is already in store, use it
        if (user && role) {
          setLoading(false);
          return;
        }

        // Otherwise, fetch session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/auth/login");
          return;
        }

        // Update store with user and role
        const userRole = session.user.user_metadata?.role || "student";
        setUser(session.user);
        setRole(userRole);
        setLoading(false);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [user, role, setUser, setRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Loading...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Error: User role not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Please provide additional information to complete your profile
          </p>
        </div>
        {role === "student" ? <StudentProfileForm /> : <FacultyProfileForm />}
      </div>
    </div>
  );
}
