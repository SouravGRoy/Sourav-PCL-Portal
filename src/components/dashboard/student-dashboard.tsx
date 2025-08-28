import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/lib/store";
import { getStudentProfile } from "@/lib/api/profiles";
import { getStudentGroups } from "@/lib/api/groups";
import { getStudentAssignments } from "@/lib/api/assignments";
import { getStudentSubmissions } from "@/lib/api/submissions";
import {
  getStudentRecentActivities,
  getActivityIcon,
  getRelativeTime,
  Activity,
} from "@/lib/api/activities";
import { StudentProfile } from "@/types";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import ProfileModal from "@/components/profile/profile-modal";
import Link from "next/link";

export default function StudentDashboard() {
  const { user } = useUserStore();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      setError("Please log in to access your dashboard");
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // Fetch student profile from Supabase
        const profileData = await getStudentProfile(user.id);
        if (!profileData) {
          throw new Error("Profile not found");
        }

        setProfile(profileData);

        // Fetch additional data
        const [groups, assignments, submissions] = await Promise.all([
          getStudentGroups(user.id),
          getStudentAssignments(user.id),
          getStudentSubmissions(user.id),
        ]);

        setGroupCount(groups.length);
        setAssignmentCount(assignments.length);
        setSubmissionCount(submissions.length);
        setPendingAssignments(
          assignments.filter(
            (a) => !submissions.some((s) => s.assignment_id === a.id)
          ).length
        );

        // Fetch recent activities
        try {
          setActivitiesLoading(true);
          const activitiesData = await getStudentRecentActivities(user.id, 3);
          setRecentActivities(activitiesData);
        } catch (activityError) {
          console.error("Error fetching activities:", activityError);
          // Don't fail the whole dashboard if activities fail
          setRecentActivities([]);
        } finally {
          setActivitiesLoading(false);
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", {
          message: error?.message || "Unknown error",
          code: error?.code,
          details: error?.details,
          stack: error?.stack,
        });

        // Handle specific error cases
        if (error?.message?.includes("not authenticated")) {
          setError("Please log in to access your dashboard");
        } else if (error?.message?.includes("profile not found")) {
          setError(
            "Your profile is not complete. Please contact your administrator."
          );
        } else {
          setError(error?.message || "Failed to load dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if user is authenticated
    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Section with Profile Info */}
      {profile && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 sm:px-8 py-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold break-words">
                  Welcome, {profile.name || "Student"}
                </h1>
                <p className="mt-2 text-blue-100">Academic Portal Dashboard</p>
                {(!profile.usn || !profile.class || !profile.semester) && (
                  <div className="flex flex-wrap items-center mt-2 gap-2">
                    <p className="text-yellow-200 text-xs sm:text-sm bg-yellow-600/20 px-3 py-1 rounded-md inline-block">
                      Complete profile info
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowProfileForm(true)}
                      className="text-xs sm:text-sm"
                    >
                      Update Profile
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-xs sm:text-sm">
                <div className="font-medium">
                  Last Login: {formatDate(new Date())}
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-blue-100">USN Number</p>
                <p className="font-medium truncate">{profile.usn || "N/A"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-blue-100">Group USN</p>
                <p className="font-medium truncate">
                  {profile.group_usn || "N/A"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-blue-100">Class</p>
                <p className="font-medium truncate">{profile.class || "N/A"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-blue-100">Semester</p>
                <p className="font-medium truncate">
                  {profile.semester || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg sm:text-xl text-blue-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                {groupCount}
              </p>
              <div className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded">
                Active
              </div>
            </div>
            <p className="text-xs sm:text-sm text-blue-600 mt-1">
              Joined study groups
            </p>
            <div className="mt-3 sm:mt-4 h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-blue-500 rounded"
                style={{ width: `${Math.min(groupCount * 20, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-green-600">
                {assignmentCount}
              </p>
              <div className="bg-green-50 text-green-600 text-xs font-medium px-2 py-1 rounded">
                Total
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Assigned tasks</p>
            <div className="mt-4 h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-green-500 rounded"
                style={{ width: `${Math.min(assignmentCount * 10, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-purple-600">
                {submissionCount}
              </p>
              <div className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-1 rounded">
                Completed
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Submitted assignments</p>
            <div className="mt-4 h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-purple-500 rounded"
                style={{
                  width: `${
                    assignmentCount
                      ? (submissionCount / assignmentCount) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-amber-600">
                {pendingAssignments}
              </p>
              <div className="bg-amber-50 text-amber-600 text-xs font-medium px-2 py-1 rounded">
                Due Soon
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending assignments</p>
            <div className="mt-4 h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-amber-500 rounded"
                style={{
                  width: `${
                    assignmentCount
                      ? (pendingAssignments / assignmentCount) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Cards */}
      {profile && profile.subject_codes && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Enrolled Subjects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.subject_codes.map((code, index) => (
              <Card
                key={index}
                className="shadow-md hover:shadow-lg transition-all hover:border-blue-300"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{code}</CardTitle>
                  <CardDescription>Course {index + 1}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Credits: {3 + (index % 2)}
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/groups/my"
            className="group block p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-blue-700 transition-colors">
              My Groups
            </h3>
            <p className="text-sm text-gray-600">
              View your groups and submit drive links
            </p>
          </Link>

          <Link
            href="/assignments/my"
            className="group block p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-green-700 transition-colors">
              View Assignments
            </h3>
            <p className="text-sm text-gray-600">
              Check your pending assignments and deadlines
            </p>
          </Link>

          <a
            href="/submissions"
            className="group block p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-lg mb-1 group-hover:text-purple-700 transition-colors">
              Submission History
            </h3>
            <p className="text-sm text-gray-600">
              View your past submissions and feedback
            </p>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent Activity
        </h2>
        <Card className="shadow-md">
          <CardContent className="p-0">
            {activitiesLoading ? (
              <div className="p-4 text-center text-gray-500">
                Loading activities...
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="divide-y">
                {recentActivities.map((activity, index) => {
                  const { icon, color } = getActivityIcon(activity.type);
                  return (
                    <div key={index} className="p-4 flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-500">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">
                            {getRelativeTime(activity.timestamp)}
                          </p>
                          {activity.type === "assignment_created" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No recent activities
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Modal */}
      {profile && (
        <ProfileModal
          isOpen={showProfileForm}
          onClose={() => setShowProfileForm(false)}
          profile={profile}
          onSuccess={() => {
            // Refresh dashboard data after successful profile update
            if (user) {
              getStudentProfile(user.id).then((updatedProfile) => {
                if (updatedProfile) {
                  setProfile(updatedProfile);
                }
              });
            }
          }}
        />
      )}
    </div>
  );
}
