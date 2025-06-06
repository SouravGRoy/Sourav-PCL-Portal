"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import GroupDetail from '@/components/groups/group-detail';
import { useUserStore } from '@/lib/store';

interface GroupClientProps {
  groupId: string;
}

export default function GroupClientPage({ groupId }: GroupClientProps) {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      // Potentially return null or a loading indicator here if preferred
    }
  }, [user, router]);

  // Optional: Add a loading state or check if user is null before rendering GroupDetail
  // if (!user) {
  //   return <MainLayout><p>Loading user...</p></MainLayout>; 
  // }

  return (
    <MainLayout>
      <GroupDetail groupId={groupId} />
    </MainLayout>
  );
}
