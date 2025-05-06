"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import StudentDashboard from '@/components/dashboard/student-dashboard';
import { useUserStore } from '@/lib/store';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    // DEVELOPMENT MODE: Check for stored role
    const devRole = localStorage.getItem('userRole');
    const devEmail = localStorage.getItem('userEmail');
    
    if (devRole === 'student') {
      // In development mode, add a button to complete profile
      // This is just for testing the profile completion flow
      return;
    }
    
    // Normal authentication flow
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'student') {
      router.push(`/dashboard/${role || ''}`);
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <StudentDashboard />
    </MainLayout>
  );
}
