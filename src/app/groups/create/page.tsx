"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import CreateGroupForm from '@/components/groups/create-group-form';
import { useUserStore } from '@/lib/store';

export default function CreateGroupPage() {
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
      <div className="max-w-md mx-auto">
        <CreateGroupForm />
      </div>
    </MainLayout>
  );
}
