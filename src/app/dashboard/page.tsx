"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useUserStore } from '@/lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { role, setRole } = useUserStore();
  
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        // DEVELOPMENT MODE: Check for role in localStorage first
        const devRole = localStorage.getItem('userRole');
        const devEmail = localStorage.getItem('userEmail');
        
        if (devRole && devEmail) {
          console.log('DEVELOPMENT MODE: Using stored role:', devRole);
          // Cast the role to UserRole type since we know it's valid
          setRole(devRole as 'student' | 'faculty' | 'superadmin');
          
          // Redirect based on role
          switch (devRole) {
            case 'student':
              router.push('/dashboard/student');
              break;
            case 'faculty':
              router.push('/dashboard/faculty');
              break;
            case 'superadmin':
              router.push('/dashboard/admin');
              break;
            default:
              setError('Unknown role. Please contact support.');
          }
          return;
        }
        
        // If no development mode data, proceed with normal authentication
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        // Get the current user from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error getting user:', userError);
          router.push('/auth/login');
          return;
        }

        // Get the user's profile to determine their role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error getting profile:', profileError);
          setError('Error retrieving your profile. Please complete your profile first.');
          router.push('/profile/complete');
          return;
        }

        if (!profile || !profile.role) {
          console.log('User has no profile or role:', user.id);
          router.push('/profile/complete');
          return;
        }

        // Set the role in the store
        setRole(profile.role);
        
        // Redirect based on role
        switch (profile.role) {
          case 'student':
            router.push('/dashboard/student');
            break;
          case 'faculty':
            router.push('/dashboard/faculty');
            break;
          case 'superadmin':
            router.push('/dashboard/admin');
            break;
          default:
            setError('Unknown role. Please contact support.');
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router, setRole]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Loading your dashboard...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}
