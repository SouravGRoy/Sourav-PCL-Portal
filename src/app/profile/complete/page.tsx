"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentProfileForm from '@/components/profile/student-profile-form';
import FacultyProfileForm from '@/components/profile/faculty-profile-form';
import { useUserStore } from '@/lib/store';
import { getUserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // DEVELOPMENT MODE: Check for stored email first
      const devEmail = localStorage.getItem('userEmail');
      const devRole = localStorage.getItem('userRole');
      
      if (devEmail) {
        console.log('DEVELOPMENT MODE: Using stored email:', devEmail);
        // Set the role based on the stored role or infer from email
        if (devRole) {
          setRole(devRole);
        } else if (devEmail.includes('@faculty')) {
          setRole('faculty');
        } else {
          setRole('student');
        }
        setLoading(false);
        return;
      }
      
      try {
        // Normal authentication flow
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
        
        if (error || !supabaseUser) {
          console.error('Error getting user:', error);
          router.push('/auth/login');
          return;
        }
        
        console.log('Authenticated user:', supabaseUser);
        
        // Check if user has a role in the profiles table
        const userRole = await getUserRole(supabaseUser.id);
        console.log('User role:', userRole);
        
        // If no role is found, use the role from user metadata if available
        if (!userRole && supabaseUser.user_metadata?.role) {
          setRole(supabaseUser.user_metadata.role);
        } else {
          setRole(userRole);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in authentication check:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [user, router]);

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
