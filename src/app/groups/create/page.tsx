"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import CreateGroupForm from '@/components/groups/create-group-form';
import { useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function CreateGroupPage() {
  const router = useRouter();
  const { user, role, setUser, setRole } = useUserStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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
          <p className="mb-6">You must be logged in as a faculty member to create groups.</p>
          <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create New Group</h1>
          <Button onClick={() => router.push('/groups')} variant="outline">
            Back to Groups
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <CreateGroupForm />
          </div>
          
          <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Group Management Instructions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Step 1: Create a Group</h3>
                <p>Fill out the form with your group details and click &ldquo;Create Group&rdquo;</p>
              </div>
              
              <div>
                <h3 className="font-medium">Step 2: Add Students</h3>
                <p>After creating a group, you&apos;ll be redirected to the groups page where you can:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Click on a group to select it</li>
                  <li>Use the search bar to find students by USN</li>
                  <li>Click &ldquo;Add&rdquo; to add students to your group</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Step 3: Manage Group</h3>
                <p>You can remove students or delete the entire group as needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
