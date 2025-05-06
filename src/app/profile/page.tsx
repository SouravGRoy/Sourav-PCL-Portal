"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import UserProfileComponent from '@/components/profile/user-profile';
import { useUserStore } from '@/lib/store';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  return (
    <MainLayout>
      <UserProfileComponent />
    </MainLayout>
  );
}
