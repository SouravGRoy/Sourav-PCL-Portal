"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import FacultySubmissionsList from '@/components/submissions/faculty-submissions-list';
import { useUserStore } from '@/lib/store';

interface AssignmentSubmissionsPageProps {
  params: {
    id: string;
  };
}

export default function AssignmentSubmissionsPage({ params }: AssignmentSubmissionsPageProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const assignmentId = params.id;

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
      <FacultySubmissionsList assignmentId={assignmentId} />
    </MainLayout>
  );
}
