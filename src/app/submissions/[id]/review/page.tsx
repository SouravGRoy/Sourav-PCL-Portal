"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import SubmissionFeedbackForm from '@/components/submissions/submission-feedback-form';
import { useUserStore } from '@/lib/store';

interface ReviewSubmissionPageProps {
  params: {
    id: string;
  };
}

export default function ReviewSubmissionPage({ params }: ReviewSubmissionPageProps) {
  const router = useRouter();
  const { user, role } = useUserStore();
  const submissionId = params.id;

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
      <div className="max-w-2xl mx-auto">
        <SubmissionFeedbackForm submissionId={submissionId} />
      </div>
    </MainLayout>
  );
}
