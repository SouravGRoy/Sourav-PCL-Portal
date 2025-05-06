import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { signOut } from '@/lib/auth';
import { UserRole } from '@/types';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const { user, role, clearUser } = useUserStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUser();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getDashboardLink = (role: UserRole | null) => {
    switch (role) {
      case 'superadmin':
        return '/dashboard/superadmin';
      case 'faculty':
        return '/dashboard/faculty';
      case 'student':
        return '/dashboard/student';
      default:
        return '/auth/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Academic Portal</h1>
                </div>
                <nav className="ml-6 flex space-x-8">
                  <a
                    href={getDashboardLink(role)}
                    className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Dashboard
                  </a>
                  {role === 'faculty' && (
                    <>
                      <a
                        href="/groups"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Groups
                      </a>
                      <a
                        href="/assignments"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Assignments
                      </a>
                    </>
                  )}
                  {role === 'student' && (
                    <>
                      <a
                        href="/groups/join"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Join Groups
                      </a>
                      <a
                        href="/assignments/my"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        My Assignments
                      </a>
                      <a
                        href="/submissions"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Submissions
                      </a>
                    </>
                  )}
                  {role === 'superadmin' && (
                    <>
                      <a
                        href="/faculty/manage"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Manage Faculty
                      </a>
                      <a
                        href="/stats"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Statistics
                      </a>
                    </>
                  )}
                </nav>
              </div>
              <div className="ml-6 flex items-center">
                <a
                  href="/profile"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </a>
                <button
                  onClick={handleSignOut}
                  className="ml-4 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
