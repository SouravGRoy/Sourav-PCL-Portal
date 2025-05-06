"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import StudentAssignments from '@/components/assignments/student-assignments';
import { useUserStore } from '@/lib/store';

export default function MyAssignmentsPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'student') {
      router.push('/dashboard');
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <StudentAssignments />
    </MainLayout>
  );
}
