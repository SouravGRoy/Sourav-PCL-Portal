"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentProfileForm from '@/components/profile/student-profile-form';
import FacultyProfileForm from '@/components/profile/faculty-profile-form';
import { useUserStore } from '@/lib/store';
import { getUserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileCompletion() {
  const router = useRouter();
  const { user } = useUserStore();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push('/auth/login');
          return;
        }

        // Update the user store with the current user
        setUser(session.user);
        
        // Set the role from user metadata
        const role = session.user.user_metadata?.role || 'student';
        setRole(role);
        setLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please provide additional information to complete your profile
          </p>
        </div>
        {role === 'student' ? <StudentProfileForm /> : <FacultyProfileForm />}
      </div>
    </div>
  );
}
