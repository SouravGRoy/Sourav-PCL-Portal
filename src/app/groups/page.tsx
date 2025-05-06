"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import GroupList from '@/components/groups/group-list';
import { useUserStore } from '@/lib/store';

export default function GroupsPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'faculty') {
      router.push('/dashboard');
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <GroupList />
    </MainLayout>
  );
}
