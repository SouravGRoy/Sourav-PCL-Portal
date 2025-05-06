"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import FacultyManagement from '@/components/faculty/faculty-management';
import { useUserStore } from '@/lib/store';

export default function ManageFacultyPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <FacultyManagement />
    </MainLayout>
  );
}
