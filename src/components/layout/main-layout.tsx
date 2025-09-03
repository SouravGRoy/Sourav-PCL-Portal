import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserStore } from "@/lib/store";
import { signOut } from "@/lib/auth";
import { UserRole } from "@/types";
import Image from "next/image";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const { user, role, clearUser } = useUserStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUser();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getDashboardLink = (role: UserRole | null) => {
    switch (role) {
      case "superadmin":
        return "/dashboard/superadmin";
      case "faculty":
        return "/dashboard/faculty";
      case "student":
        return "/dashboard/student";
      default:
        return "/auth/login";
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Responsive header with mobile menu */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  href={getDashboardLink(role)}
                  className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  <Image
                    src="/kiweM.png"
                    alt="Logo"
                    width={100}
                    height={100}
                    className="m-2 mt-3 "
                  />
                </Link>
              </div>

              {/* Desktop navigation */}
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                {user ? (
                  <>
                    <Link
                      href={getDashboardLink(role)}
                      className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    {role === "faculty" && (
                      <>
                        {/* <Link
                          href="/groups"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          Groups
                        </Link> */}
                        <Link
                          href="/mcq-test"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          MCQ Tests
                        </Link>
                        <Link
                          href="/feedback"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          Feedback
                        </Link>
                      </>
                    )}
                    {role === "student" && (
                      <>
                        <Link
                          href="/mcq-test"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          MCQ Tests
                        </Link>
                        <Link
                          href="/feedback"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          Feedback
                        </Link>
                      </>
                    )}
                    {role === "superadmin" && (
                      <>
                        <Link
                          href="/faculty/manage"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          Manage Faculty
                        </Link>
                        <Link
                          href="/stats"
                          className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        >
                          Statistics
                        </Link>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/assignments"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Assignments
                    </Link>
                    <Link
                      href="/assignments/create"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Create Assignment
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Desktop profile and auth links */}
            <div className="hidden md:ml-6 md:flex md:items-center">
              <Link
                href="/profile"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="ml-4 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="ml-4 text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-controls="mobile-menu"
                aria-expanded="false"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {user ? (
                <>
                  <Link
                    href={getDashboardLink(role)}
                    className="bg-indigo-50 text-indigo-700 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {role === "faculty" && (
                    <>
                      {/* <Link
                        href="/groups"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Groups
                      </Link>
                      <Link
                        href="/assignments"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Assignments
                      </Link> */}
                      <Link
                        href="/mcq-test"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        MCQ Tests
                      </Link>
                      <Link
                        href="/feedback"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Feedback
                      </Link>
                    </>
                  )}
                  {role === "student" && (
                    <>
                      <Link
                        href="/groups/join"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Join Groups
                      </Link>
                      <Link
                        href="/assignments/my"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Assignments
                      </Link>
                      <Link
                        href="/mcq-test"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        MCQ Tests
                      </Link>
                      <Link
                        href="/feedback"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Feedback
                      </Link>
                      <Link
                        href="/submissions"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Submissions
                      </Link>
                    </>
                  )}
                  {role === "superadmin" && (
                    <>
                      <Link
                        href="/faculty/manage"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Manage Faculty
                      </Link>
                      <Link
                        href="/stats"
                        className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Statistics
                      </Link>
                    </>
                  )}
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    href="/profile"
                    className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/assignments"
                    className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Assignments
                  </Link>
                  <Link
                    href="/assignments/create"
                    className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Create Assignment
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    href="/auth/login"
                    className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
