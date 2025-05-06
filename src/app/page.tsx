"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user, role } = useUserStore();

  useEffect(() => {
    // If user is already logged in, redirect to their dashboard
    if (user) {
      if (role === 'student') {
        router.push('/dashboard/student');
      } else if (role === 'faculty') {
        router.push('/dashboard/faculty');
      } else if (role === 'superadmin') {
        router.push('/dashboard/superadmin');
      } else {
        router.push('/profile/complete');
      }
    }
  }, [user, role, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Academic Portal</h1>
            </div>
            <div className="flex items-center">
              <Button asChild variant="outline" className="mr-2">
                <a href="/auth/login">Sign In</a>
              </Button>
              <Button asChild>
                <a href="/auth/register">Register</a>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Jain University Academic Portal
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              A comprehensive platform for academic management between faculty and students
            </p>
          </div>
          
          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>For Students</CardTitle>
                  <CardDescription>Manage your academic journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li>Create and manage your academic profile</li>
                    <li>Join faculty groups</li>
                    <li>Submit assignments</li>
                    <li>Track your academic progress</li>
                  </ul>
                  <Button asChild className="mt-4 w-full">
                    <a href="/auth/register">Register as Student</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>For Faculty</CardTitle>
                  <CardDescription>Manage your students and courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li>Create student groups</li>
                    <li>Manage assignments</li>
                    <li>Review submissions</li>
                    <li>Track student progress</li>
                  </ul>
                  <Button asChild className="mt-4 w-full">
                    <a href="/auth/register">Register as Faculty</a>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>For Administrators</CardTitle>
                  <CardDescription>System-wide oversight</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li>Manage faculty accounts</li>
                    <li>View system-wide statistics</li>
                    <li>Complete oversight of all activities</li>
                  </ul>
                  <Button asChild className="mt-4 w-full">
                    <a href="/auth/login">Admin Login</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Jain University Academic Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
