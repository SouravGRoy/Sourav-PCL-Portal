"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import StudentGroups from '@/components/groups/student-groups';
import { useUserStore } from '@/lib/store';

export default function MyGroupsPage() {
  const router = useRouter();
  const { user, role } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEVELOPMENT MODE: Check for stored role
    const devRole = localStorage.getItem('userRole');
    
    if (devRole === 'student') {
      // Allow access for students in development mode
      setLoading(false);
      return;
    }
    
    // Normal authentication flow
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'student') {
      router.push(`/dashboard/${role || ''}`);
      return;
    }
    
    setLoading(false);
  }, [user, role, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <StudentGroups />
    </MainLayout>
  );
}
