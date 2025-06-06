"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import AssignmentList from '@/components/assignments/assignment-list';
import { useUserStore } from '@/lib/store';

interface AssignmentsClientProps {
  groupId: string;
}

export default function GroupAssignmentsClientPage({ groupId }: AssignmentsClientProps) {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Assignments for Group</h1>
        {/* You might want to fetch and display group name here if needed */}
        <AssignmentList groupId={groupId} />
      </div>
    </MainLayout>
  );
}
