"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import FacultyDashboard from '@/components/dashboard/faculty-dashboard';
import { useUserStore } from '@/lib/store';

export default function FacultyDashboardPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    // DEVELOPMENT MODE: Check for stored role
    const devRole = localStorage.getItem('userRole');
    
    if (devRole === 'faculty') {
      // Allow access for faculty in development mode
      return;
    }
    
    // Normal authentication flow
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'faculty') {
      router.push(`/dashboard/${role || ''}`);
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <FacultyDashboard />
    </MainLayout>
  );
}
