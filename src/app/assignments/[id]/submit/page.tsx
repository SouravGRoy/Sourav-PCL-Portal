"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import SubmitAssignmentForm from '@/components/assignments/submit-assignment-form';
import { useUserStore } from '@/lib/store';

interface SubmitAssignmentPageProps {
  params: {
    id: string;
  };
}

export default function SubmitAssignmentPage({ params }: SubmitAssignmentPageProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const assignmentId = params.id;

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
      <div className="max-w-md mx-auto">
        <SubmitAssignmentForm assignmentId={assignmentId} />
      </div>
    </MainLayout>
  );
}
