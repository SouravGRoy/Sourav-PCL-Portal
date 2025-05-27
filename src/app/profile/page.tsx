"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import UserProfileComponent from '@/components/profile/user-profile';
import EnhancedFacultyProfile from '@/components/profile/enhanced-faculty-profile';
import { useUserStore } from '@/lib/store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, role } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for Supabase authenticated user
    if (!user) {
      // Check for development mode using localStorage (consistent with login-form.tsx)
      const devEmail = localStorage.getItem('userEmail');
      const devRole = localStorage.getItem('userRole');
      
      if (devEmail && (devRole === 'faculty' || devRole === 'student')) {
        console.log('DEVELOPMENT MODE: Using stored email for profile page:', devEmail);
        // Set loading to false to show profile in development mode
        setLoading(false);
      } else {
        // No authenticated user or development data, redirect to login
        router.push('/auth/login');
      }
    } else {
      // User is authenticated via Supabase
      setLoading(false);
    }
  }, [user, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {role === 'faculty' ? (
        <EnhancedFacultyProfile />
      ) : (
        <UserProfileComponent />
      )}
    </MainLayout>
  );
}
