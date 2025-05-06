"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import SuperAdminDashboard from '@/components/dashboard/superadmin-dashboard';
import { useUserStore } from '@/lib/store';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'superadmin') {
      router.push(`/dashboard/${role || ''}`);
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <SuperAdminDashboard />
    </MainLayout>
  );
}
