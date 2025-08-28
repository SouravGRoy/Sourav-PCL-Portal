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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  FileText,
  Users,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Award,
  Target,
  BarChart3,
  GraduationCap,
  ClipboardCheck,
  Activity,
  ExternalLink,
  Eye,
  Upload,
  Plus,
} from "lucide-react";
import { useUserStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getStudentProfile } from "@/lib/api/profiles";
import { getStudentGroups } from "@/lib/api/groups";
import { getStudentAssignments } from "@/lib/api/assignments";
import {
  getStudentSubmissions,
  getStudentSubmissionOverview,
} from "@/lib/api/student-submissions";
import {
  getStudentAttendanceSummary,
  getStudentSessionHistory,
} from "@/lib/api/attendance";
import {
  Activity as ActivityType,
  getStudentRecentActivities,
  getActivityIcon,
  getRelativeTime,
} from "@/lib/api/activities";
import Link from "next/link";

interface StudentDashboardStats {
  totalAssignments: number;
  pendingAssignments: number;
  submittedAssignments: number;
  gradedAssignments: number;
  totalGroups: number;
  averageGrade: number;
  completionRate: number;
  attendanceRate: number;
}

interface GroupWithDetails {
  id: string;
  name: string;
  subject: string;
  subject_code: string;
  semester: string;
  year: string;
  department: string;
  pcl_group_no: string;
  faculty_name?: string;
  total_assignments: number;
  pending_assignments: number;
  average_grade: number;
  last_activity: string;
}

interface AssignmentOverview {
  id: string;
  title: string;
  dueDate: string;
  type: "individual" | "group";
  maxScore: number;
  groupName: string;
  status: "pending" | "submitted" | "graded" | "overdue";
  score?: number;
  feedback?: string;
  daysUntilDue: number;
}

interface AttendanceRecord {
  date: string;
  groupName: string;
  status: "present" | "absent" | "late" | "excused";
  session_type: "lecture" | "lab" | "tutorial" | "seminar" | "practical";
}

export default function StudentDashboardTabs() {
  const { user } = useUserStore();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<StudentDashboardStats>({
    totalAssignments: 0,
    pendingAssignments: 0,
    submittedAssignments: 0,
    gradedAssignments: 0,
    totalGroups: 0,
    averageGrade: 0,
    completionRate: 0,
    attendanceRate: 0,
  });
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOverview[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      fetchAllDashboardData();
    }
  }, [user]);

  const fetchAllDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch basic profile data
      const profileData = await getStudentProfile(user.id);
      setProfile(profileData);

      // Fetch groups
      const groupsData = await getStudentGroups(user.id);

      // Fetch assignments
      const assignmentsData = await getStudentAssignments(user.id);

      // Get student profile ID
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let submissionOverview = null;
      // Student submission overview will be calculated from the submissions data
      // No need for a separate API call

      // Transform groups data with mock additional details
      const groupsWithDetails: GroupWithDetails[] = groupsData.map((group) => ({
        ...group,
        faculty_name: "Dr. Faculty Name", // This would come from a join in real implementation
        total_assignments: Math.floor(Math.random() * 10) + 5,
        pending_assignments: Math.floor(Math.random() * 3),
        average_grade: Math.floor(Math.random() * 20) + 80,
        last_activity: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }));

      setGroups(groupsWithDetails);

      // Transform assignments data with real submission status
      const now = new Date();
      const assignmentOverview: AssignmentOverview[] = [];

      if (studentProfile) {
        // Get all submissions for this student using auth user ID
        const studentSubmissions = await getStudentSubmissions(
          user.id // Use auth user ID (profiles.id) instead of student profile ID
        );

        for (const assignment of assignmentsData) {
          const dueDate = new Date(assignment.due_date);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const groupName =
            groupsData.find((g) => g.id === assignment.group_id)?.name ||
            "Unknown Group";

          // Find submission for this assignment
          const submission = studentSubmissions.find(
            (s) => s.assignment_id === assignment.id
          );

          let status: "pending" | "submitted" | "graded" | "overdue";
          let score: number | undefined;

          if (submission) {
            if (submission.status === "graded") {
              status = "graded";
              score = submission.total_score || undefined;
            } else {
              status = "submitted";
            }
          } else {
            status = daysUntilDue < 0 ? "overdue" : "pending";
          }

          assignmentOverview.push({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.due_date,
            type: assignment.type as "individual" | "group",
            maxScore: assignment.max_score,
            groupName,
            status,
            score,
            daysUntilDue,
          });
        }
      } else {
        // Fallback to mock data if no student profile
        for (const assignment of assignmentsData) {
          const dueDate = new Date(assignment.due_date);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const groupName =
            groupsData.find((g) => g.id === assignment.group_id)?.name ||
            "Unknown Group";

          const mockStatus =
            Math.random() > 0.7
              ? "graded"
              : Math.random() > 0.5
              ? "submitted"
              : daysUntilDue < 0
              ? "overdue"
              : "pending";

          assignmentOverview.push({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.due_date,
            type: assignment.type as "individual" | "group",
            maxScore: assignment.max_score,
            groupName,
            status: mockStatus,
            score:
              mockStatus === "graded"
                ? Math.floor(Math.random() * assignment.max_score)
                : undefined,
            daysUntilDue,
          });
        }
      }

      setAssignments(assignmentOverview);

      // Calculate stats
      const pendingCount = assignmentOverview.filter(
        (a) => a.status === "pending" || a.status === "overdue"
      ).length;
      const submittedCount = assignmentOverview.filter(
        (a) => a.status === "submitted"
      ).length;
      const gradedCount = assignmentOverview.filter(
        (a) => a.status === "graded"
      ).length;
      const gradedAssignments = assignmentOverview.filter(
        (a) => a.status === "graded" && a.score
      );
      const averageGrade =
        gradedAssignments.length > 0
          ? gradedAssignments.reduce(
              (sum, a) => sum + (a.score! / a.maxScore) * 100,
              0
            ) / gradedAssignments.length
          : 0;

      // Calculate real attendance data across all groups
      let totalSessions = 0;
      let totalAttended = 0;
      let allAttendanceRecords: AttendanceRecord[] = [];

      // Fetch attendance data for each group
      for (const group of groupsData) {
        try {
          const attendanceSummary = await getStudentAttendanceSummary(
            user.id,
            group.id
          );
          if (attendanceSummary) {
            totalSessions += attendanceSummary.total_sessions;
            totalAttended += attendanceSummary.attended_sessions;
          }

          // Get session history for recent attendance records
          const sessionHistory = await getStudentSessionHistory(
            user.id,
            group.id
          );
          const recentSessions = sessionHistory.slice(0, 5); // Get recent 5 sessions per group

          // Convert to AttendanceRecord format
          for (const session of recentSessions) {
            allAttendanceRecords.push({
              date: session.created_at,
              groupName: group.name,
              status: session.attendance_status || "absent",
              session_type: session.session_type || "lecture",
            });
          }
        } catch (error) {
          console.error(
            `Error fetching attendance for group ${group.id}:`,
            error
          );
          // Continue with other groups even if one fails
        }
      }

      // Calculate overall attendance rate
      const realAttendanceRate =
        totalSessions > 0
          ? Math.round((totalAttended / totalSessions) * 100)
          : 0;

      const mockStats: StudentDashboardStats = {
        totalAssignments: assignmentOverview.length,
        pendingAssignments: pendingCount,
        submittedAssignments: submittedCount,
        gradedAssignments: gradedCount,
        totalGroups: groupsData.length,
        averageGrade: averageGrade,
        completionRate:
          assignmentOverview.length > 0
            ? Math.round(
                ((submittedCount + gradedCount) / assignmentOverview.length) *
                  100
              )
            : 0,
        attendanceRate: realAttendanceRate,
      };

      setStats(mockStats);

      // Sort attendance records by date (most recent first) and limit to 20
      allAttendanceRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAttendanceRecords(allAttendanceRecords.slice(0, 20));

      // Fetch recent activities
      try {
        setActivitiesLoading(true);
        const activitiesData = await getStudentRecentActivities(user.id, 4);
        setRecentActivities(activitiesData);
      } catch (activityError) {
        console.error("Error fetching activities:", activityError);
        // Don't fail the whole dashboard if activities fail
        setRecentActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-green-500";
      case "submitted":
        return "bg-blue-500";
      case "pending":
        return "bg-orange-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "present":
        return "text-green-600";
      case "late":
        return "text-yellow-600";
      case "absent":
        return "text-red-600";
      case "excused":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:px-0 px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {profile?.name || "Student"}!
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Track your academic progress and manage your coursework
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto">
          <TabsList
            className="
      flex w-full min-w-max sm:grid sm:grid-cols-5 
      lg:w-auto lg:inline-flex
    "
          >
            <TabsTrigger
              value="overview"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Classes</span>
              <span className="sm:hidden">Classes</span>
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Attendance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:px-0 px-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Classes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGroups}</div>
                <p className="text-xs text-muted-foreground">
                  Active enrollments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Assignments
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingAssignments} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Grade
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getGradeColor(
                    stats.averageGrade
                  )}`}
                >
                  {stats.averageGrade.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all subjects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Attendance
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getGradeColor(
                    stats.attendanceRate
                  )}`}
                >
                  {stats.attendanceRate}%
                </div>
                <p className="text-xs text-muted-foreground">This semester</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center text-gray-500 py-4">
                    Loading activities...
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => {
                      const { icon, color } = getActivityIcon(activity.type);
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {activity.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400">
                                {getRelativeTime(activity.timestamp)}
                              </p>
                              {activity.type === "assignment_created" && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
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
                  <div className="text-center text-gray-500 py-4">
                    No recent activities
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments
                  .filter((a) => a.status === "pending" && a.daysUntilDue >= 0)
                  .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
                  .slice(0, 5)
                  .map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {assignment.groupName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {assignment.daysUntilDue === 0
                            ? "Today"
                            : assignment.daysUntilDue === 1
                            ? "Tomorrow"
                            : `${assignment.daysUntilDue} days`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {assignment.maxScore} pts
                        </p>
                      </div>
                    </div>
                  ))}
                {assignments.filter(
                  (a) => a.status === "pending" && a.daysUntilDue >= 0
                ).length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No upcoming deadlines
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-6">
          <div className="flex items-center justify-between md:px-0 px-4">
            <h2 className="text-2xl font-bold">My Classes</h2>
            <Button asChild variant="outline">
              <Link href="/groups/join">
                <Plus className="h-4 w-4 mr-2" />
                Join New Class
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:px-0 px-2">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>
                        {group.subject} ({group.subject_code})
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{group.pcl_group_no}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Semester</p>
                      <p className="text-gray-600">
                        {group.semester} {group.year}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Department</p>
                      <p className="text-gray-600">{group.department}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Assignments</span>
                      <span className="font-medium">
                        {group.total_assignments}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending</span>
                      <span className="text-orange-600 font-medium">
                        {group.pending_assignments}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Average Grade</span>
                      <span
                        className={`font-medium ${getGradeColor(
                          group.average_grade
                        )}`}
                      >
                        {group.average_grade}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/groups/${group.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href={`/groups/${group.id}/assignments`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Assignments
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  No Classes Yet
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  You haven't joined any classes yet. Join classes to see
                  assignments and track your progress.
                </p>
                <Button asChild>
                  <Link href="/groups/join">Join Classes</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <div className="flex items-center justify-between md:px-0 px-4">
            <h2 className="text-2xl font-bold">Assignments</h2>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/assignments">
                  <FileText className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </div>

          {/* Assignment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:px-0 px-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.pendingAssignments}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.submittedAssignments}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Graded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.gradedAssignments}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getGradeColor(
                    stats.averageGrade
                  )}`}
                >
                  {stats.averageGrade.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.slice(0, 10).map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-gray-500">
                            {assignment.maxScore} points • {assignment.type}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.groupName}</TableCell>
                      <TableCell>
                        <div>
                          <p>
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assignment.daysUntilDue >= 0
                              ? `${assignment.daysUntilDue} days left`
                              : `${Math.abs(
                                  assignment.daysUntilDue
                                )} days overdue`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            assignment.status
                          )} text-white`}
                        >
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.score !== undefined ? (
                          <span
                            className={getGradeColor(
                              (assignment.score / assignment.maxScore) * 100
                            )}
                          >
                            {assignment.score}/{assignment.maxScore}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {assignment.status === "pending" ||
                          assignment.status === "overdue" ? (
                            <Button size="sm" asChild>
                              <Link
                                href={`/assignments/${assignment.id}/submit`}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Submit
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/assignments/${assignment.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {assignments.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No assignments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="flex items-center justify-between md:px-0 px-4">
            <h2 className="text-2xl font-bold">Attendance</h2>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {stats.attendanceRate}% Overall
            </Badge>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:px-0 px-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {
                    attendanceRecords.filter((r) => r.status === "present")
                      .length
                  }
                </div>
                <p className="text-sm text-gray-500">
                  Sessions attended on time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-700">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {attendanceRecords.filter((r) => r.status === "late").length}
                </div>
                <p className="text-sm text-gray-500">Late arrivals</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {
                    attendanceRecords.filter((r) => r.status === "absent")
                      .length
                  }
                </div>
                <p className="text-sm text-gray-500">Sessions missed</p>
              </CardContent>
            </Card>
            {attendanceRecords.some((r) => r.status === "excused") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-700">Excused</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {
                      attendanceRecords.filter((r) => r.status === "excused")
                        .length
                    }
                  </div>
                  <p className="text-sm text-gray-500">Excused absences</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>
                Your attendance record for the current semester
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Session Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.slice(0, 15).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.groupName}</TableCell>
                      <TableCell className="capitalize">
                        {record.session_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getAttendanceColor(
                            record.status
                          )} border-current`}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendanceRecords.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
