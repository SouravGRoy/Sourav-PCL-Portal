"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import StudentSubmissionsList from '@/components/submissions/student-submissions-list';
import { useUserStore } from '@/lib/store';

export default function SubmissionsPage() {
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
      <StudentSubmissionsList />
    </MainLayout>
  );
}
