"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import CreateAssignmentForm from '@/components/assignments/create-assignment-form';
import { useUserStore } from '@/lib/store';

interface CreateGroupAssignmentPageProps {
  params: {
    id: string;
  };
}

export default function CreateGroupAssignmentPage({ params }: CreateGroupAssignmentPageProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const groupId = params.id;

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
      <div className="max-w-md mx-auto">
        <CreateAssignmentForm groupId={groupId} />
      </div>
    </MainLayout>
  );
}
