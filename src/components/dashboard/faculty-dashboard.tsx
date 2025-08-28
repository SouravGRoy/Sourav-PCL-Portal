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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserStore } from "@/lib/store";
import { getFacultyProfile, getStudentCount } from "@/lib/api/profiles";
import {
  getGroupsByFaculty,
  getGroupCountByFaculty,
  getGroupsWithDetailsbyFaculty,
  createGroup,
  getGroupMembers,
} from "@/lib/api/groups";
import { getFacultyAssignments } from "@/lib/api/assignments";
import {
  getFacultyRecentActivities,
  Activity as ActivityType,
  getActivityIcon,
  getRelativeTime,
} from "@/lib/api/activities";
import { getFacultyAttendanceStats } from "@/lib/api/attendance";
import { FacultyProfile, Group, FacultyAttendanceStats } from "@/types";
import {
  Plus,
  BarChart3,
  GraduationCap,
  Users,
  ClipboardCheck,
  Clock,
  Activity,
  FileText,
  Radio,
  Calendar,
  Bell,
  Eye,
  Edit,
  Trash2,
  QrCode,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  Download,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  className: string;
  type: "individual" | "group";
  status: "active" | "closed";
  submissions: number;
  gradedSubmissions?: number; // Optional since not all APIs provide this
  totalStudents: number;
}

interface Class {
  id: string;
  name: string;
  code: string;
  semester: string;
  studentCount: number;
  students: Array<{
    id: string;
    name: string;
    email: string;
    studentId: string;
  }>;
}

// Enhanced form state for new class creation
interface NewClassForm {
  name: string;
  subject: string;
  subject_code: string;
  semester: string;
  year: string;
  department: string;
  pcl_group_no: string;
  description: string;
}

export default function FacultyDashboard() {
  // New state for tabbed interface
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [showNewClass, setShowNewClass] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );
  const [showViewAssignment, setShowViewAssignment] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(
    null
  );

  // Existing state variables preserved
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    setRefreshKey((prev) => prev + 1);
  };
  const { user } = useUserStore();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for enhanced functionality
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>([]);
  const [groupMemberCounts, setGroupMemberCounts] = useState<
    Record<string, number>
  >({});
  const [attendanceStats, setAttendanceStats] =
    useState<FacultyAttendanceStats>({
      overallAttendanceRate: 0,
      totalSessions: 0,
      totalStudents: 0,
      classAttendanceStats: [],
    });

  // New form states
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    dueDate: "",
    classId: "",
    type: "individual" as "individual" | "group",
  });

  const [newClass, setNewClass] = useState<NewClassForm>({
    name: "",
    subject: "",
    subject_code: "",
    semester: "",
    year: "",
    department: "",
    pcl_group_no: "",
    description: "",
  });

  // State for editing assignments
  const [editAssignment, setEditAssignment] = useState({
    title: "",
    description: "",
    dueDate: "",
    classId: "",
    type: "individual" as "individual" | "group",
    status: "active" as "active" | "closed",
  });

  // Existing useEffect preserved and enhanced
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        console.log("Starting to fetch dashboard data");

        // If no user is found, check for development mode
        if (!user) {
          console.log("No user found, checking for development mode");
          const devEmail = localStorage.getItem("userEmail");
          const devRole = localStorage.getItem("userRole");

          if (devEmail && devRole === "faculty") {
            console.log(
              "DEVELOPMENT MODE: Using stored email for faculty dashboard:",
              devEmail
            );

            const profileKey = `facultyProfile_${devEmail}`;
            const storedProfileData = localStorage.getItem(profileKey);
            let mockProfile;

            if (storedProfileData) {
              const parsedProfile = JSON.parse(storedProfileData);
              const baseProfile = {
                id: "dev-faculty-id",
                email: devEmail,
                role: "faculty" as const,
                name: "Development Faculty",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              mockProfile = {
                ...baseProfile,
                ...parsedProfile,
                name: parsedProfile.name || baseProfile.name,
                department: parsedProfile.department || "Department",
              } as FacultyProfile;
            } else {
              const baseProfile = {
                id: "dev-faculty-id",
                email: devEmail,
                role: "faculty" as const,
                name: "Development Faculty",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              mockProfile = {
                ...baseProfile,
                name: "Development Faculty",
                department: "Computer Science",
              } as FacultyProfile;
            }

            setProfile(mockProfile);
            setGroupCount(3);
            setStudentCount(12);
            setAssignmentCount(0);

            // Set mock groups data
            setGroups([
              {
                id: "1",
                name: "Data Structures & Algorithms",
                subject: "Data Structures & Algorithms",
                subject_code: "CS301",
                semester: "Fall 2024",
                year: "2024",
                faculty_id: "dev-faculty-id",
                department: "Computer Science",
                pcl_group_no: "PCL001",
                description: "Advanced data structures and algorithms",
                member_count: 32,
                assignment_count: 2,
                created_at: new Date().toISOString(),
              },
              {
                id: "2",
                name: "Database Systems",
                subject: "Database Systems",
                subject_code: "CS401",
                semester: "Fall 2024",
                year: "2024",
                faculty_id: "dev-faculty-id",
                department: "Computer Science",
                pcl_group_no: "PCL002",
                description: "Database design and management",
                member_count: 28,
                assignment_count: 1,
                created_at: new Date().toISOString(),
              },
              {
                id: "3",
                name: "Web Development",
                subject: "Web Development",
                subject_code: "CS205",
                semester: "Fall 2024",
                year: "2024",
                faculty_id: "dev-faculty-id",
                department: "Computer Science",
                pcl_group_no: "PCL003",
                description: "Modern web development techniques",
                member_count: 35,
                assignment_count: 0,
                created_at: new Date().toISOString(),
              },
            ]);

            // Set mock member counts that match the mock groups
            setGroupMemberCounts({
              "1": 32,
              "2": 28,
              "3": 35,
            });

            // Set mock assignments data
            setAssignments([
              {
                id: "1",
                title: "Binary Tree Implementation",
                description:
                  "Implement a binary search tree with all basic operations",
                dueDate: "2024-08-15",
                classId: "1",
                className: "Data Structures & Algorithms",
                type: "individual",
                status: "active",
                submissions: 18,
                gradedSubmissions: 2,
                totalStudents: 32,
              },
              {
                id: "2",
                title: "Group Project: Social Media Database",
                description:
                  "Design and implement a database schema for a social media platform",
                dueDate: "2024-08-20",
                classId: "2",
                className: "Database Systems",
                type: "group",
                status: "active",
                submissions: 6,
                gradedSubmissions: 1,
                totalStudents: 28,
              },
            ]);

            // Set mock activities for development
            setRecentActivities([
              {
                id: "dev_1",
                type: "assignment_created",
                title: "Assignment Created",
                description:
                  'New assignment "Binary Tree Implementation" was created',
                timestamp: new Date(
                  Date.now() - 2 * 60 * 60 * 1000
                ).toISOString(), // 2 hours ago
                group_id: "1",
                group_name: "Data Structures & Algorithms",
                actor_name: "You",
                actor_role: "faculty",
              },
              {
                id: "dev_2",
                type: "submission_received",
                title: "Submission Received",
                description: 'John Doe submitted "Algorithm Analysis"',
                timestamp: new Date(
                  Date.now() - 4 * 60 * 60 * 1000
                ).toISOString(), // 4 hours ago
                group_id: "2",
                group_name: "Database Systems",
                actor_name: "John Doe",
                actor_role: "student",
              },
              {
                id: "dev_3",
                type: "announcement_created",
                title: "Announcement Made",
                description: 'Posted "Important: Midterm Schedule"',
                timestamp: new Date(
                  Date.now() - 24 * 60 * 60 * 1000
                ).toISOString(), // 1 day ago
                group_id: "1",
                group_name: "Data Structures & Algorithms",
                actor_name: "You",
                actor_role: "faculty",
                metadata: { priority: "high" },
              },
            ]);

            setIsLoading(false);
            return;
          }
          setIsLoading(false);
          return;
        }

        // Fetch real data when user exists
        const profileData = await getFacultyProfile(user.id);
        const groupsData = await getGroupsWithDetailsbyFaculty(user.id);
        const groupCountData = await getGroupCountByFaculty(user.id);
        const studentCountData = await getStudentCount();
        const assignmentsData = await getFacultyAssignments(user.id);

        if (profileData) {
          setProfile(profileData);
        } else {
          const defaultProfile = {
            id: user.id,
            email: user.email || "",
            role: "faculty" as const,
            name: "Faculty Member",
            department: "Department",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as FacultyProfile;
          setProfile(defaultProfile);
        }

        // Handle groups data
        let processedGroups: Group[] = [];
        if (Array.isArray(groupsData)) {
          processedGroups = groupsData;
          setGroups(groupsData);
        } else if (groupsData && (groupsData as any).success) {
          processedGroups = (groupsData as any).data || [];
          setGroups(processedGroups);
        }

        // Fetch actual member counts for each group
        const memberCounts: Record<string, number> = {};
        for (const group of processedGroups) {
          try {
            const members = await getGroupMembers(group.id);
            memberCounts[group.id] = Array.isArray(members)
              ? members.length
              : 0;
          } catch (error) {
            console.error(
              `Error fetching members for group ${group.id}:`,
              error
            );
            memberCounts[group.id] = 0;
          }
        }
        setGroupMemberCounts(memberCounts);

        setGroupCount(typeof groupCountData === "number" ? groupCountData : 0);
        setStudentCount(
          typeof studentCountData === "number" ? studentCountData : 0
        );

        // Handle assignments data
        if (Array.isArray(assignmentsData)) {
          const mappedAssignments = assignmentsData.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            dueDate: a.due_date,
            classId: a.group_id || "",
            className: a.group_name || "Unknown Class",
            type: a.type || "individual",
            status: a.status || "active",
            submissions: a.submissions_count || 0,
            gradedSubmissions: a.graded_submissions_count, // Keep undefined if not provided
            totalStudents: a.total_students || 0,
          }));
          setAssignments(mappedAssignments);
          setAssignmentCount(mappedAssignments.length);
        } else if (assignmentsData && (assignmentsData as any).success) {
          const assignmentData = (assignmentsData as any).data || [];
          const mappedAssignments = assignmentData.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            dueDate: a.due_date,
            classId: a.group_id || "",
            className: a.group_name || "Unknown Class",
            type: a.type || "individual",
            status: a.status || "active",
            submissions: a.submissions_count || 0,
            gradedSubmissions: a.graded_submissions_count, // Keep undefined if not provided
            totalStudents: a.total_students || 0,
          }));
          setAssignments(mappedAssignments);
          setAssignmentCount(mappedAssignments.length);
        }

        // Fetch recent activities
        try {
          const activitiesData = await getFacultyRecentActivities(user.id, 3);
          setRecentActivities(activitiesData);
        } catch (error) {
          console.error("Error fetching recent activities:", error);
          setRecentActivities([]);
        }

        // Fetch attendance statistics
        try {
          const attendanceData = await getFacultyAttendanceStats(user.id);
          setAttendanceStats(attendanceData);
        } catch (error) {
          console.error("Error fetching attendance stats:", error);
          setAttendanceStats({
            overallAttendanceRate: 0,
            totalSessions: 0,
            totalStudents: 0,
            classAttendanceStats: [],
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, refreshKey]);

  // New handler functions
  const handleCreateAssignment = () => {
    if (newAssignment.title && newAssignment.classId && newAssignment.dueDate) {
      const selectedGroup = groups.find((g) => g.id === newAssignment.classId);
      const assignment: Assignment = {
        id: Date.now().toString(),
        ...newAssignment,
        className: selectedGroup?.name || "",
        status: "active",
        submissions: 0,
        gradedSubmissions: 0, // Start with 0 graded submissions
        totalStudents: groupMemberCounts[newAssignment.classId] || 0,
      };
      setAssignments([...assignments, assignment]);
      setNewAssignment({
        title: "",
        description: "",
        dueDate: "",
        classId: "",
        type: "individual",
      });
      setShowNewAssignment(false);
    }
  };

  const handleExportReports = () => {
    // Create report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      faculty: profile?.name || "Faculty Member",
      summary: {
        totalClasses: groupCount,
        totalStudents: studentCount,
        activeAssignments: activeAssignments.length,
        totalSubmissions: totalSubmissions,
        totalGraded: totalGraded,
        avgSubmissionRate: activeAvgSubmissionRate,
      },
      classes: groups.map((group) => {
        const classAssignments = assignments.filter(
          (a) => a.classId === group.id
        );
        const classSubmissions = classAssignments.reduce(
          (sum, a) => sum + (a.submissions || 0),
          0
        );
        const classGraded = classAssignments.reduce(
          (sum, a) => sum + (a.gradedSubmissions || 0),
          0
        );
        const memberCount = groupMemberCounts[group.id] || 0;
        const submissionRate =
          memberCount > 0 && classAssignments.length > 0
            ? Math.round(
                (classSubmissions / (classAssignments.length * memberCount)) *
                  100
              )
            : 0;

        return {
          name: group.name,
          subjectCode: group.subject_code,
          semester: group.semester,
          students: memberCount,
          assignments: classAssignments.length,
          submissions: classSubmissions,
          graded: classGraded,
          submissionRate: submissionRate,
        };
      }),
      assignments: assignments.map((assignment) => ({
        title: assignment.title,
        className: assignment.className,
        dueDate: assignment.dueDate,
        type: assignment.type,
        status: assignment.status,
        totalStudents: assignment.totalStudents,
        submissions: assignment.submissions,
        graded: assignment.gradedSubmissions || 0,
        submissionRate:
          assignment.totalStudents > 0
            ? Math.round(
                (assignment.submissions / assignment.totalStudents) * 100
              )
            : 0,
      })),
    };

    // Convert to CSV format for download
    const csvContent = [
      "Faculty Reports Summary",
      `Generated: ${new Date().toLocaleDateString()}`,
      `Faculty: ${profile?.name || "Faculty Member"}`,
      "",
      "Overall Summary:",
      `Total Classes: ${groupCount}`,
      `Total Students: ${studentCount}`,
      `Active Assignments: ${activeAssignments.length}`,
      `Total Submissions: ${totalSubmissions}`,
      `Graded Submissions: ${totalGraded}`,
      `Average Submission Rate: ${activeAvgSubmissionRate}%`,
      "",
      "Class Details:",
      "Class Name,Subject Code,Semester,Students,Assignments,Submissions,Graded,Submission Rate",
      ...reportData.classes.map(
        (c) =>
          `"${c.name}",${c.subjectCode},${c.semester},${c.students},${c.assignments},${c.submissions},${c.graded},${c.submissionRate}%`
      ),
      "",
      "Assignment Details:",
      "Title,Class,Due Date,Type,Status,Total Students,Submissions,Graded,Submission Rate",
      ...reportData.assignments.map(
        (a) =>
          `"${a.title}","${a.className}",${a.dueDate},${a.type},${a.status},${a.totalStudents},${a.submissions},${a.graded},${a.submissionRate}%`
      ),
    ].join("\n");

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `faculty-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCreateClass = async () => {
    if (!user) return;

    if (
      newClass.name &&
      newClass.subject_code &&
      newClass.semester &&
      newClass.year
    ) {
      try {
        const groupData: Partial<Group> = {
          name: newClass.name,
          subject: newClass.subject,
          subject_code: newClass.subject_code,
          semester: newClass.semester,
          year: newClass.year,
          department:
            newClass.department || profile?.department || "Computer Science",
          pcl_group_no: newClass.pcl_group_no || `PCL${Date.now()}`,
          faculty_id: user.id,
          description: newClass.description,
        };

        const createdGroup = await createGroup(groupData);

        if (createdGroup) {
          // Add the new group to the current list with default counts
          const enhancedGroup: Group = {
            ...createdGroup,
            member_count: 0,
            assignment_count: 0,
          };
          setGroups([...groups, enhancedGroup]);
          setGroupCount(groupCount + 1);
          // Update member counts state for the new group
          setGroupMemberCounts((prev) => ({ ...prev, [createdGroup.id]: 0 }));

          // Reset form
          setNewClass({
            name: "",
            subject: "",
            subject_code: "",
            semester: "",
            year: "",
            department: "",
            pcl_group_no: "",
            description: "",
          });
          setShowNewClass(false);
        }
      } catch (error) {
        console.error("Error creating class:", error);
        // You can add toast notification here if available
      }
    }
  };

  // Handler for viewing assignment details
  const handleViewAssignment = (assignment: Assignment) => {
    setViewingAssignment(assignment);
    setShowViewAssignment(true);
  };

  // Handler for editing assignment
  const handleEditAssignment = (assignment: Assignment) => {
    // Close any existing dialogs first
    setShowViewAssignment(false);

    // Reset editing state
    setEditingAssignment(null);

    // Set assignment data with a small delay to prevent conflicts
    setTimeout(() => {
      setEditingAssignment(assignment);
      setEditAssignment({
        title: assignment.title || "",
        description: assignment.description || "",
        dueDate: assignment.dueDate || "",
        classId: assignment.classId || "",
        type: assignment.type,
        status: assignment.status,
      });
      setShowEditAssignment(true);
    }, 100);
  };

  // Handler for saving edited assignment
  const handleSaveEditedAssignment = () => {
    if (!editingAssignment) return;

    // Update the assignment in the assignments array
    const updatedAssignments = assignments.map((assignment) =>
      assignment.id === editingAssignment.id
        ? {
            ...assignment,
            title: editAssignment.title,
            description: editAssignment.description,
            dueDate: editAssignment.dueDate,
            classId: editAssignment.classId,
            className:
              groups.find((g) => g.id === editAssignment.classId)?.name ||
              assignment.className,
            type: editAssignment.type,
            status: editAssignment.status,
          }
        : assignment
    );

    setAssignments(updatedAssignments);

    // Reset edit state with proper cleanup
    setShowEditAssignment(false);
    setTimeout(() => {
      setEditingAssignment(null);
      setEditAssignment({
        title: "",
        description: "",
        dueDate: "",
        classId: "",
        type: "individual",
        status: "active",
      });
    }, 100);
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  const displayProfile = {
    name: profile?.name || "Faculty Member",
    department: profile?.department || "Department",
    role: "faculty",
    id: user?.id || "default-id",
    email: user?.email || "faculty@example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Calculate enhanced statistics with safety checks
  const totalSubmissions = assignments.reduce(
    (sum, a) => sum + (a.submissions || 0),
    0
  );

  // Only calculate graded stats if we have graded submission data
  const hasGradedData = assignments.some(
    (a) => a.gradedSubmissions !== undefined && a.gradedSubmissions !== null
  );

  const pendingGrading = hasGradedData
    ? assignments.reduce(
        (sum, a) =>
          sum + Math.max(0, (a.submissions || 0) - (a.gradedSubmissions || 0)),
        0
      )
    : 0; // Don't show pending if we don't have graded data

  const totalGraded = hasGradedData
    ? assignments.reduce((sum, a) => sum + (a.gradedSubmissions || 0), 0)
    : 0;
  const avgSubmissionRate =
    assignments && assignments.length > 0
      ? Math.round(
          (assignments.reduce((sum, a) => {
            // Prevent division by zero and ensure valid numbers
            const submissionRate =
              a.totalStudents && a.totalStudents > 0
                ? (a.submissions || 0) / a.totalStudents
                : 0;
            return sum + submissionRate;
          }, 0) /
            assignments.length) *
            100
        )
      : 0;

  // Calculate average submission rate for active assignments only
  const activeAssignments = assignments.filter((a) => a.status === "active");
  const activeAvgSubmissionRate =
    activeAssignments && activeAssignments.length > 0
      ? Math.round(
          (activeAssignments.reduce((sum, a) => {
            const submissionRate =
              a.totalStudents && a.totalStudents > 0
                ? (a.submissions || 0) / a.totalStudents
                : 0;
            return sum + submissionRate;
          }, 0) /
            activeAssignments.length) *
            100
        )
      : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return "Good Morning";
                if (hour < 17) return "Good Afternoon";
                return "Good Evening";
              })()}
              , {displayProfile.name}!
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-500" />
              Ready to inspire and educate
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none min-w-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <a href="/profile/complete" className="flex-1 sm:flex-none">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Profile</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupCount}</div>
            <p className="text-xs text-muted-foreground">
              {studentCount} total students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeAvgSubmissionRate}% avg submission rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Attendance Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendanceStats.totalSessions > 0
                ? `${attendanceStats.overallAttendanceRate}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats.totalSessions > 0
                ? `${attendanceStats.totalSessions} sessions conducted`
                : "No sessions conducted yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Graded Submissions</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalGraded}
            </div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 overflow-x-auto">
          <TabsList className="w-full min-w-max grid grid-cols-5 lg:w-auto lg:inline-flex">
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
            <TabsTrigger
              value="analytics"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  ) : (
                    recentActivities.map((activity) => {
                      const { icon, color } = getActivityIcon(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${color} mt-2 flex-shrink-0`}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.description}
                                </p>
                                {activity.group_name && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    {activity.group_name}
                                  </p>
                                )}
                              </div>
                              {activity.metadata?.priority && (
                                <Badge
                                  variant={
                                    activity.metadata.priority === "high"
                                      ? "destructive"
                                      : activity.metadata.priority === "normal"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="ml-2 text-xs"
                                >
                                  {activity.metadata.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getRelativeTime(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setShowNewAssignment(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Assignment
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setShowNewClass(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Class
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    asChild
                  >
                    <a href="/groups/manage">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Groups
                    </a>
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setShowReports(true)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Classes Quick Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{group.subject_code}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {groupMemberCounts[group.id] || 0} students
                      </span>
                    </div>
                    <h4 className="mb-2 font-medium">{group.name}</h4>
                    <p className="text-sm mb-3">
                      <span className="font-extrabold">Sem -</span>{" "}
                      {group.semester}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <a href={`/groups/${group.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Classes</h2>
            <Button onClick={() => setShowNewClass(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Class
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {group.name}
                    <Badge variant="outline">{group.subject_code}</Badge>
                  </CardTitle>
                  <p className="text-sm font-extrabold">
                    <span className="font-extrabold">Sem -</span>{" "}
                    {group.semester}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Students:</span>
                      <span>{groupMemberCounts[group.id] || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assignments:</span>
                      <span>
                        {
                          assignments.filter((a) => a.classId === group.id)
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/groups/${group.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Assignments</h2>
            <Button onClick={() => setShowNewAssignment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.description
                              ? `${assignment.description.substring(0, 50)}...`
                              : "No description provided"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.className}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.type === "group"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {assignment.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment.dueDate}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-semibold">
                            {assignment.submissions}/{assignment.totalStudents}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(
                              (assignment.submissions /
                                assignment.totalStudents) *
                                100
                            )}
                            % submitted
                          </div>
                          {hasGradedData && (
                            <div className="text-xs text-green-600">
                              {assignment.gradedSubmissions || 0} graded
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAssignment(assignment)}
                            title="View Assignment Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAssignment(assignment)}
                            title="Edit Assignment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {group.name}
                    <Badge variant="outline">{group.subject_code}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {group.semester}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Students:</span>
                      <span>{groupMemberCounts[group.id] || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Attendance:</span>
                      {(() => {
                        const classStats =
                          attendanceStats.classAttendanceStats.find(
                            (stats) => stats.groupId === group.id
                          );
                        return classStats && classStats.totalSessions > 0 ? (
                          <Badge
                            variant="outline"
                            className={
                              classStats.averageAttendance >= 75
                                ? "text-green-600 border-green-600"
                                : classStats.averageAttendance >= 60
                                ? "text-yellow-600 border-yellow-600"
                                : "text-red-600 border-red-600"
                            }
                          >
                            {classStats.averageAttendance}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            N/A
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sessions:</span>
                      <span>
                        {(() => {
                          const classStats =
                            attendanceStats.classAttendanceStats.find(
                              (stats) => stats.groupId === group.id
                            );
                          return classStats?.totalSessions || 0;
                        })()}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      asChild
                    >
                      <a href={`/groups/${group.id}?tab=attendance`}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Manage Attendance
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Header with Time Period Selector */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Analytics & Insights</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                📈 Live Data
              </Badge>
              <select className="p-2 border rounded-md text-sm">
                <option value="current">Current Semester</option>
                <option value="last30">Last 30 Days</option>
                <option value="lastSem">Previous Semester</option>
              </select>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Class Performance
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {activeAvgSubmissionRate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg. submission rate
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Engagement Score
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {activeAvgSubmissionRate > 0
                        ? `${Math.min(activeAvgSubmissionRate + 5, 100)}%`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on submission activity
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Grading Efficiency
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {hasGradedData
                        ? Math.round(
                            (totalGraded / Math.max(totalSubmissions, 1)) * 100
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed grading
                    </p>
                  </div>
                  <ClipboardCheck className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Students
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {studentCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all classes
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submission Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Submission Trends
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Assignment submission rates over time
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No assignment data available
                    </div>
                  ) : (
                    <>
                      {/* Mini Chart Representation */}
                      <div className="h-48 bg-gradient-to-t from-blue-50 to-white rounded-lg p-4 relative">
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-end justify-between space-x-1 h-32">
                            {assignments
                              .slice(0, 6)
                              .map((assignment, index) => {
                                const height = Math.max(
                                  (assignment.submissions /
                                    assignment.totalStudents) *
                                    100,
                                  5
                                );
                                return (
                                  <div
                                    key={assignment.id}
                                    className="flex flex-col items-center flex-1"
                                  >
                                    <div
                                      className={`w-full rounded-t ${
                                        height >= 75
                                          ? "bg-green-500"
                                          : height >= 50
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{ height: `${height}%` }}
                                    ></div>
                                    <div className="text-xs text-muted-foreground mt-1 text-center">
                                      A{index + 1}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        <div className="absolute top-4 left-4 text-sm font-medium">
                          Submission Rate %
                        </div>
                      </div>

                      {/* Legend and Statistics */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            {
                              assignments.filter(
                                (a) => a.submissions / a.totalStudents >= 0.75
                              ).length
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            High Performance (75%+)
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-yellow-600">
                            {
                              assignments.filter((a) => {
                                const rate = a.submissions / a.totalStudents;
                                return rate >= 0.5 && rate < 0.75;
                              }).length
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Medium Performance (50-75%)
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">
                            {
                              assignments.filter(
                                (a) => a.submissions / a.totalStudents < 0.5
                              ).length
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Needs Attention (&lt;50%)
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Class Performance Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Class Performance Breakdown
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Individual class analytics
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No class data available
                    </div>
                  ) : (
                    groups.map((group) => {
                      const classAssignments = assignments.filter(
                        (a) => a.classId === group.id
                      );
                      const classSubmissions = classAssignments.reduce(
                        (sum, a) => sum + (a.submissions || 0),
                        0
                      );
                      const memberCount = groupMemberCounts[group.id] || 0;
                      const totalPossible =
                        classAssignments.length * memberCount;
                      const submissionRate =
                        totalPossible > 0
                          ? Math.round((classSubmissions / totalPossible) * 100)
                          : 0;

                      return (
                        <div key={group.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{group.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {group.subject_code}
                              </p>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-bold ${
                                  submissionRate >= 75
                                    ? "text-green-600"
                                    : submissionRate >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {submissionRate}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Performance
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full ${
                                submissionRate >= 75
                                  ? "bg-green-500"
                                  : submissionRate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${submissionRate}%` }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>Students: {memberCount}</div>
                            <div>Assignments: {classAssignments.length}</div>
                            <div>Submissions: {classSubmissions}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Attendance Analytics
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Class attendance patterns and trends
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overall Attendance Stats */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {attendanceStats.totalSessions > 0
                            ? `${attendanceStats.overallAttendanceRate}%`
                            : "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Overall Attendance
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">
                          {attendanceStats.totalSessions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Sessions
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {attendanceStats.totalSessions > 0
                        ? `Across ${attendanceStats.classAttendanceStats.length} classes`
                        : "No attendance sessions conducted yet"}
                    </div>
                  </div>

                  {/* Class-wise Attendance */}
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const classStats =
                        attendanceStats.classAttendanceStats.find(
                          (stats) => stats.groupId === group.id
                        );
                      const attendanceRate = classStats?.averageAttendance || 0;
                      const progressWidth = Math.min(attendanceRate, 100);

                      return (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-3 border rounded"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {group.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {group.subject_code} •{" "}
                              {classStats?.totalSessions || 0} sessions
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  attendanceRate >= 75
                                    ? "bg-green-500"
                                    : attendanceRate >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${progressWidth}%` }}
                              ></div>
                            </div>
                            <div
                              className={`text-sm font-medium w-10 text-right ${
                                attendanceRate >= 75
                                  ? "text-green-600"
                                  : attendanceRate >= 60
                                  ? "text-yellow-600"
                                  : attendanceRate > 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {attendanceRate > 0
                                ? `${attendanceRate}%`
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Engagement Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Student Engagement Insights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Participation and interaction patterns
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Engagement Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {assignments.length > 0
                          ? `${activeAvgSubmissionRate}%`
                          : "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assignment Participation
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <div className="text-xl font-bold text-gray-500">N/A</div>
                      <div className="text-xs text-muted-foreground">
                        Discussion Activity
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div>
                    <h4 className="font-medium mb-2 text-sm">
                      Top Performing Students
                    </h4>
                    <div className="space-y-2">
                      <div className="text-center p-4 text-muted-foreground">
                        <div className="text-sm">
                          Student performance data not available
                        </div>
                        <div className="text-xs mt-1">
                          Connect grading system to view rankings
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Trends */}
                  <div>
                    <h4 className="font-medium mb-2 text-sm">
                      Weekly Engagement Trend
                    </h4>
                    <div className="text-center p-4 text-muted-foreground">
                      <div className="text-sm">
                        Weekly engagement data not available
                      </div>
                      <div className="text-xs mt-1">
                        Requires activity tracking implementation
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Deadline Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Assignment Deadline Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Submission patterns relative to deadlines
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Submission Timing Analysis - Based on Real Data */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-500">N/A</div>
                  <div className="text-sm font-medium">Early Submissions</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requires submission timestamp tracking
                  </div>
                  <div className="mt-2">
                    <TrendingUp className="h-4 w-4 text-gray-400 mx-auto" />
                  </div>
                </div>

                {/* On-time Submissions */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-500">N/A</div>
                  <div className="text-sm font-medium">On-time Submissions</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requires submission timestamp tracking
                  </div>
                  <div className="mt-2">
                    <Clock className="h-4 w-4 text-gray-400 mx-auto" />
                  </div>
                </div>

                {/* Late Submissions */}
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-500">N/A</div>
                  <div className="text-sm font-medium">Late Submissions</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requires submission timestamp tracking
                  </div>
                  <div className="mt-2">
                    <TrendingDown className="h-4 w-4 text-gray-400 mx-auto" />
                  </div>
                </div>
              </div>

              {/* Recent Assignment Performance */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">
                  Recent Assignment Performance
                </h4>
                <div className="space-y-3">
                  {assignments.slice(0, 3).map((assignment) => {
                    const submissionRate = Math.round(
                      (assignment.submissions / assignment.totalStudents) * 100
                    );
                    const isOverdue = new Date(assignment.dueDate) < new Date();

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">{assignment.title}</h5>
                            <Badge
                              variant={
                                assignment.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {assignment.status}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {assignment.className} • Due:{" "}
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              submissionRate >= 75
                                ? "text-green-600"
                                : submissionRate >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {submissionRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignment.submissions}/{assignment.totalStudents}{" "}
                            submitted
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export and Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleExportReports}>
              <Download className="h-4 w-4 mr-2" />
              Export Analytics
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Global Dialogs - accessible from anywhere in the component */}
      <Dialog open={showNewAssignment} onOpenChange={setShowNewAssignment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={newAssignment.title}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    title: e.target.value,
                  })
                }
                placeholder="Enter assignment title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAssignment.description}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    description: e.target.value,
                  })
                }
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <select
                value={newAssignment.classId}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    classId: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a class</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.subject_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Assignment Type</Label>
              <select
                value={newAssignment.type}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    type: e.target.value as "individual" | "group",
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    dueDate: e.target.value,
                  })
                }
              />
            </div>
            <Button onClick={handleCreateAssignment} className="w-full">
              Create Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Creation Dialog */}
      <Dialog open={showNewClass} onOpenChange={setShowNewClass}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={newClass.name}
                  onChange={(e) =>
                    setNewClass({ ...newClass, name: e.target.value })
                  }
                  placeholder="e.g. Data Structures & Algorithms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newClass.subject}
                  onChange={(e) =>
                    setNewClass({ ...newClass, subject: e.target.value })
                  }
                  placeholder="e.g. Data Structures & Algorithms"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  value={newClass.subject_code}
                  onChange={(e) =>
                    setNewClass({
                      ...newClass,
                      subject_code: e.target.value,
                    })
                  }
                  placeholder="e.g. CS301"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newClass.department}
                  onChange={(e) =>
                    setNewClass({
                      ...newClass,
                      department: e.target.value,
                    })
                  }
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  value={newClass.semester}
                  onChange={(e) =>
                    setNewClass({ ...newClass, semester: e.target.value })
                  }
                  placeholder="e.g. 1st Semester"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Academic Year</Label>
                <Input
                  id="year"
                  value={newClass.year}
                  onChange={(e) =>
                    setNewClass({ ...newClass, year: e.target.value })
                  }
                  placeholder="e.g. 2024-25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pclGroupNo">PCL Group Number</Label>
              <Input
                id="pclGroupNo"
                value={newClass.pcl_group_no}
                onChange={(e) =>
                  setNewClass({
                    ...newClass,
                    pcl_group_no: e.target.value,
                  })
                }
                placeholder="e.g., PCL001 (Don't leave this field blank. If this isn't a PCL group, enter 'NA')"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newClass.description}
                onChange={(e) =>
                  setNewClass({
                    ...newClass,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description of the class..."
                rows={3}
              />
            </div>

            <Button onClick={handleCreateClass} className="w-full">
              Create Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Assignment Dialog */}
      <Dialog open={showViewAssignment} onOpenChange={setShowViewAssignment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Assignment Details
            </DialogTitle>
          </DialogHeader>
          {viewingAssignment && (
            <div className="space-y-6">
              {/* Assignment Header */}
              <div className="border-b pb-4">
                <h3 className="text-xl font-semibold">
                  {viewingAssignment.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Class: {viewingAssignment.className}</span>
                  <Badge
                    variant={
                      viewingAssignment.type === "group"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {viewingAssignment.type}
                  </Badge>
                  <Badge
                    variant={
                      viewingAssignment.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {viewingAssignment.status}
                  </Badge>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                    {viewingAssignment.description || "No description provided"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Due Date</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded-md">
                    {new Date(viewingAssignment.dueDate).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>

              {/* Submission Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Submission Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {viewingAssignment.totalStudents}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Students
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {viewingAssignment.submissions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submitted
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {viewingAssignment.totalStudents -
                        viewingAssignment.submissions}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(
                        (viewingAssignment.submissions /
                          viewingAssignment.totalStudents) *
                          100
                      )}
                      %
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completion
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowViewAssignment(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewAssignment(false);
                    handleEditAssignment(viewingAssignment);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Assignment
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Navigate to submissions page
                    window.location.href = `/submissions?assignment=${viewingAssignment.id}`;
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Submissions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={showEditAssignment}
        onOpenChange={(open) => {
          setShowEditAssignment(open);
          if (!open) {
            // Reset state when dialog closes
            setTimeout(() => {
              setEditingAssignment(null);
              setEditAssignment({
                title: "",
                description: "",
                dueDate: "",
                classId: "",
                type: "individual",
                status: "active",
              });
            }, 100);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTitle">Assignment Title</Label>
              <Input
                id="editTitle"
                value={editAssignment.title}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    title: e.target.value,
                  })
                }
                placeholder="Enter assignment title"
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editAssignment.description}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    description: e.target.value,
                  })
                }
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="editClass">Class</Label>
              <select
                value={editAssignment.classId}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    classId: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a class</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.subject_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="editType">Assignment Type</Label>
              <select
                value={editAssignment.type}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    type: e.target.value as "individual" | "group",
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editStatus">Status</Label>
              <select
                value={editAssignment.status}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    status: e.target.value as "active" | "closed",
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editDueDate">Due Date</Label>
              <Input
                id="editDueDate"
                type="date"
                value={editAssignment.dueDate}
                onChange={(e) =>
                  setEditAssignment({
                    ...editAssignment,
                    dueDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditAssignment(false);
                  setTimeout(() => {
                    setEditingAssignment(null);
                    setEditAssignment({
                      title: "",
                      description: "",
                      dueDate: "",
                      classId: "",
                      type: "individual",
                      status: "active",
                    });
                  }, 100);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEditedAssignment} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Faculty Reports Dialog */}
      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg sm:text-xl">
              <BarChart3 className="h-5 w-5 mr-2" />
              Faculty Reports & Analytics
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Total Classes
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {groupCount}
                      </p>
                    </div>
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Active classes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Total Students
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {studentCount}
                      </p>
                    </div>
                    <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Users className="h-3 w-3 inline mr-1" />
                    Across all classes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Active Assignments
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {activeAssignments.length}
                      </p>
                    </div>
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Target className="h-3 w-3 inline mr-1" />
                    {activeAvgSubmissionRate}% avg submission rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Total Submissions
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {totalSubmissions}
                      </p>
                    </div>
                    <ClipboardCheck className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Award className="h-3 w-3 inline mr-1" />
                    {totalGraded} graded
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Class Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Class Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No classes available
                    </p>
                  ) : (
                    groups.map((group) => {
                      const classAssignments = assignments.filter(
                        (a) => a.classId === group.id
                      );
                      const classSubmissions = classAssignments.reduce(
                        (sum, a) => sum + (a.submissions || 0),
                        0
                      );
                      const classGraded = classAssignments.reduce(
                        (sum, a) => sum + (a.gradedSubmissions || 0),
                        0
                      );
                      const memberCount = groupMemberCounts[group.id] || 0;
                      const submissionRate =
                        memberCount > 0
                          ? Math.round(
                              (classSubmissions /
                                (classAssignments.length * memberCount)) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          key={group.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-sm sm:text-base">
                              {group.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {group.subject_code} • {group.semester}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 sm:flex sm:items-center sm:space-x-4 lg:space-x-6 gap-2 sm:gap-0 text-xs sm:text-sm">
                            <div className="text-center">
                              <p className="font-medium text-sm sm:text-base">
                                {memberCount}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Students
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-sm sm:text-base">
                                {classAssignments.length}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Assignments
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-sm sm:text-base">
                                {classSubmissions}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Submissions
                              </p>
                            </div>
                            <div className="text-center sm:block hidden">
                              <p className="font-medium text-green-600">
                                {submissionRate}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Rate
                              </p>
                            </div>
                            <div className="text-center sm:block hidden">
                              <p className="font-medium text-blue-600">
                                {classGraded}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Graded
                              </p>
                            </div>
                          </div>
                          {/* Mobile-only bottom row for additional stats */}
                          <div className="grid grid-cols-2 gap-2 sm:hidden">
                            <div className="text-center bg-green-50 p-2 rounded">
                              <p className="font-medium text-green-600 text-sm">
                                {submissionRate}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Rate
                              </p>
                            </div>
                            <div className="text-center bg-blue-50 p-2 rounded">
                              <p className="font-medium text-blue-600 text-sm">
                                {classGraded}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Graded
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Assignment Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Assignment Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No assignments available
                    </p>
                  ) : (
                    assignments.map((assignment) => {
                      const submissionRate =
                        assignment.totalStudents > 0
                          ? Math.round(
                              (assignment.submissions /
                                assignment.totalStudents) *
                                100
                            )
                          : 0;
                      const gradingProgress =
                        assignment.submissions > 0
                          ? Math.round(
                              ((assignment.gradedSubmissions || 0) /
                                assignment.submissions) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          key={assignment.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-sm sm:text-base">
                              {assignment.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {assignment.className} • Due:{" "}
                              {new Date(
                                assignment.dueDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 lg:space-x-6 gap-2 sm:gap-0 text-xs sm:text-sm">
                            <div className="text-center">
                              <p className="font-medium text-sm sm:text-base">
                                {assignment.totalStudents}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Students
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-sm sm:text-base">
                                {assignment.submissions}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Submitted
                              </p>
                            </div>
                            <div className="text-center sm:block hidden">
                              <p
                                className={`font-medium ${
                                  submissionRate >= 75
                                    ? "text-green-600"
                                    : submissionRate >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {submissionRate}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Rate
                              </p>
                            </div>
                            <div className="text-center sm:block hidden">
                              <p className="font-medium text-blue-600">
                                {assignment.gradedSubmissions || 0}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Graded
                              </p>
                            </div>
                            <div className="text-center sm:block hidden">
                              <p
                                className={`font-medium ${
                                  gradingProgress === 100
                                    ? "text-green-600"
                                    : gradingProgress > 0
                                    ? "text-yellow-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {gradingProgress}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Progress
                              </p>
                            </div>
                            <div className="sm:block hidden">
                              <Badge
                                variant={
                                  assignment.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                          {/* Mobile-only bottom section */}
                          <div className="sm:hidden space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center bg-gray-50 p-2 rounded">
                                <p
                                  className={`font-medium text-sm ${
                                    submissionRate >= 75
                                      ? "text-green-600"
                                      : submissionRate >= 50
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {submissionRate}%
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Rate
                                </p>
                              </div>
                              <div className="text-center bg-blue-50 p-2 rounded">
                                <p className="font-medium text-blue-600 text-sm">
                                  {assignment.gradedSubmissions || 0}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Graded
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-center bg-gray-50 p-2 rounded flex-1 mr-2">
                                <p
                                  className={`font-medium text-sm ${
                                    gradingProgress === 100
                                      ? "text-green-600"
                                      : gradingProgress > 0
                                      ? "text-yellow-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {gradingProgress}%
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Progress
                                </p>
                              </div>
                              <Badge
                                variant={
                                  assignment.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowReports(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
              <Button
                className="flex items-center justify-center w-full sm:w-auto"
                onClick={handleExportReports}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
