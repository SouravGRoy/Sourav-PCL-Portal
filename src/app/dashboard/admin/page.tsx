"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import AdminDashboardTabs from '@/components/dashboard/admin-dashboard-tabs';
import { useUserStore } from '@/lib/store';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    // DEVELOPMENT MODE: Check for stored role
    const devRole = localStorage.getItem('userRole');
    
    if (devRole === 'superadmin') {
      // Allow access for superadmin in development mode
      return;
    }
    
    // Normal authentication flow
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (role !== 'superadmin') {
      router.push(`/dashboard/${role || ''}`);
    }
  }, [user, role, router]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage all aspects of the academic portal
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            <Button size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New User
            </Button>
          </div>
        </div>
        
        <AdminDashboardTabs />
      </div>
    </MainLayout>
  );
}
