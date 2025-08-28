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
import { toast } from "@/components/ui/use-toast";
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
} from "lucide-react";
import { useUserStore } from "@/lib/store";
import { getStudentProfile } from "@/lib/api/profiles";
import { getStudentGroups } from "@/lib/api/groups";
import { getStudentAssignments } from "@/lib/api/assignments";
import Link from "next/link";

interface StudentDashboardStats {
  totalAssignments: number;
  pendingAssignments: number;
  submittedAssignments: number;
  gradedAssignments: number;
  totalGroups: number;
  averageGrade: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  type:
    | "assignment_created"
    | "assignment_submitted"
    | "grade_received"
    | "joined_group";
  title: string;
  description: string;
  timestamp: string;
  assignmentId?: string;
  groupId?: string;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  dueDate: string;
  type: "individual" | "group";
  maxScore: number;
  groupName: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

export default function EnhancedStudentDashboard() {
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
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    UpcomingDeadline[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch basic profile data
      const profileData = await getStudentProfile(user.id);
      setProfile(profileData);

      // Fetch groups
      const groups = await getStudentGroups(user.id);

      // Fetch assignments
      const assignments = await getStudentAssignments(user.id);

      // Calculate stats
      const now = new Date();
      const pendingAssignments = assignments.filter((a) => {
        // This would need to check submission status from actual submissions
        return a.status === "active" && new Date(a.due_date) > now;
      });

      const overdueAssignments = assignments.filter((a) => {
        return a.status === "active" && new Date(a.due_date) <= now;
      });

      // Mock submission and grading data for now
      const mockStats: StudentDashboardStats = {
        totalAssignments: assignments.length,
        pendingAssignments:
          pendingAssignments.length + overdueAssignments.length,
        submittedAssignments: Math.floor(assignments.length * 0.6), // Mock 60% submitted
        gradedAssignments: Math.floor(assignments.length * 0.4), // Mock 40% graded
        totalGroups: groups.length,
        averageGrade: 85.5, // Mock average grade
        completionRate:
          Math.floor(((assignments.length * 0.6) / assignments.length) * 100) ||
          0,
      };

      setStats(mockStats);

      // Calculate upcoming deadlines
      const upcoming = assignments
        .filter((a) => a.status === "active")
        .map((a) => {
          const dueDate = new Date(a.due_date);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            id: a.id,
            title: a.title,
            dueDate: a.due_date,
            type: a.type as "individual" | "group",
            maxScore: a.max_score,
            groupName:
              groups.find((g) => g.id === a.group_id)?.name || "Unknown Group",
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          };
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
        .slice(0, 5);

      setUpcomingDeadlines(upcoming);

      // Mock recent activity
      const mockActivity: RecentActivity[] = [
        {
          id: "1",
          type: "assignment_created",
          title: "New Assignment Available",
          description: "Database Design Project has been assigned",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          assignmentId: assignments[0]?.id,
        },
        {
          id: "2",
          type: "grade_received",
          title: "Grade Received",
          description: "You received 88/100 on Web Development Quiz",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          assignmentId: assignments[1]?.id,
        },
        {
          id: "3",
          type: "assignment_submitted",
          title: "Assignment Submitted",
          description: "Successfully submitted React Component Exercise",
          timestamp: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(), // 2 days ago
          assignmentId: assignments[2]?.id,
        },
      ];

      setRecentActivity(mockActivity);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "assignment_created":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "assignment_submitted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "grade_received":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "joined_group":
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
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
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.name || "Student"}!
          </h1>
          <p className="text-gray-600">
            Here's an overview of your academic progress
          </p>
        </div>
        <div className="text-right">
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalGroups} groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingAssignments}
            </div>
            <p className="text-xs text-muted-foreground">Need your attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getGradeColor(
                stats.averageGrade
              )}`}
            >
              {stats.averageGrade}%
            </div>
            <p className="text-xs text-muted-foreground">
              Keep up the great work!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completionRate}%
            </div>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Stay on top of your assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming deadlines!</p>
                <p className="text-sm text-gray-400">You're all caught up</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className={`p-4 rounded-lg border ${
                      deadline.isOverdue
                        ? "bg-red-50 border-red-200"
                        : deadline.daysUntilDue <= 2
                        ? "bg-orange-50 border-orange-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {deadline.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {deadline.groupName} • {deadline.maxScore} points
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {new Date(deadline.dueDate).toLocaleDateString()}
                          </span>
                          <Badge
                            variant={
                              deadline.type === "group"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {deadline.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            deadline.isOverdue
                              ? "text-red-600"
                              : deadline.daysUntilDue <= 2
                              ? "text-orange-600"
                              : "text-gray-600"
                          }`}
                        >
                          {deadline.isOverdue
                            ? "Overdue"
                            : deadline.daysUntilDue === 0
                            ? "Due today"
                            : deadline.daysUntilDue === 1
                            ? "Due tomorrow"
                            : `${deadline.daysUntilDue} days`}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="mt-2"
                        >
                          <Link href={`/assignments/${deadline.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/assignments">View All Assignments</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest academic updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">
                  Check back later for updates
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {getTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                    {activity.assignmentId && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/assignments/${activity.assignmentId}`}>
                          View
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-20 flex flex-col">
              <Link href="/assignments">
                <FileText className="h-6 w-6 mb-2" />
                View Assignments
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex flex-col">
              <Link href="/submissions">
                <CheckCircle className="h-6 w-6 mb-2" />
                My Submissions
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex flex-col">
              <Link href="/groups">
                <Users className="h-6 w-6 mb-2" />
                My Groups
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex flex-col">
              <Link href="/profile">
                <Award className="h-6 w-6 mb-2" />
                Profile & Grades
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
