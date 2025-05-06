"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import AssignmentList from '@/components/assignments/assignment-list';
import { useUserStore } from '@/lib/store';

interface GroupAssignmentsPageProps {
  params: {
    id: string;
  };
}

export default function GroupAssignmentsPage({ params }: GroupAssignmentsPageProps) {
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
      <AssignmentList groupId={groupId} />
    </MainLayout>
  );
}
