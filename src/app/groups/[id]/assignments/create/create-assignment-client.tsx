"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import CreateAssignmentForm from '@/components/assignments/create-assignment-form';
import { useUserStore } from '@/lib/store';

interface CreateAssignmentClientProps {
  groupId: string;
}

export default function CreateGroupAssignmentClientPage({ groupId }: CreateAssignmentClientProps) {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'faculty') {
      // Redirect if not a faculty member, or show an unauthorized message
      router.push('/dashboard'); // Or a more specific unauthorized page
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Assignment for Group</h1>
        {/* Optionally, display group name or ID here if helpful */}
        <CreateAssignmentForm groupId={groupId} />
      </div>
    </MainLayout>
  );
}
