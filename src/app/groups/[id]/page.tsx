"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import GroupDetail from '@/components/groups/group-detail';
import { useUserStore } from '@/lib/store';

interface GroupPageProps {
  params: {
    id: string;
  };
}

export default function GroupPage({ params }: GroupPageProps) {
  const router = useRouter();
  const { user } = useUserStore();
  const groupId = params.id;

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  return (
    <MainLayout>
      <GroupDetail groupId={groupId} />
    </MainLayout>
  );
}
