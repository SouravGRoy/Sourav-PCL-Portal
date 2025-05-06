"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { useUserStore } from '@/lib/store';

export default function AssignmentsPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Redirect to appropriate assignments page based on role
    if (role === 'student') {
      router.push('/assignments/my');
    } else if (role === 'faculty') {
      router.push('/groups');
    } else {
      router.push('/dashboard');
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <div className="text-center p-8">Redirecting...</div>
    </MainLayout>
  );
}
