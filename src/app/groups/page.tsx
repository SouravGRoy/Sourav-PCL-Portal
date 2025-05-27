"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import GroupList from '@/components/groups/group-list';
import GroupManagement from '@/components/groups/group-management';
import StudentGroups from '@/components/groups/student-groups';
import { useUserStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function GroupsPage() {
  const router = useRouter();
  const { user, role, setUser, setRole } = useUserStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showManagement, setShowManagement] = useState(false);

  useEffect(() => {
    // Check and refresh session if needed
    const checkSession = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('No active session found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        // If we have a session but no user in store, update the store
        if (session.user && !user) {
          console.log('Session found but no user in store, updating store');
          setUser(session.user);
          
          // Get user profile to determine role
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
            
          if (userError) {
            console.error('Error fetching user profile:', userError);
            router.push('/auth/login');
            return;
          }
          
          setRole(userData.role || 'student');
          
          // Check if user is faculty
          if (userData.role !== 'faculty') {
            console.log(`User has role ${userData.role}, not faculty. Redirecting to dashboard`);
            router.push('/dashboard');
            return;
          }
        } else if (user && role !== 'faculty') {
          // We have a user but not faculty role
          console.log(`User has role ${role}, not faculty. Redirecting to dashboard`);
          router.push('/dashboard');
          return;
        }
        
        // User is authorized as faculty
        console.log('User is authorized as faculty');
        setIsAuthorized(true);
        setAuthChecked(true);
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/auth/login');
      }
    };
    
    checkSession();
  }, [user, role, router, setUser, setRole]);

  if (!authChecked) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">You must be logged in as a faculty member to view groups.</p>
          <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {role === 'faculty' ? (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Group Management</h1>
              <Button
                onClick={() => router.push('/groups/create')}
                variant="default"
              >
                Create New Group
              </Button>
            </div>
            <p className="text-gray-600">Create and manage your student groups. Click on a group to see details and add students.</p>
            <GroupManagement />
          </>
        ) : (
          <StudentGroups />
        )}
      </div>
    </MainLayout>
  );
}
