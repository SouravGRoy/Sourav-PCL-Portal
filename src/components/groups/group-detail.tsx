import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUserStore } from "@/lib/store";
import {
  removeStudentFromGroup,
  addStudentToGroup,
  updateGroup,
} from "@/lib/api/groups";
import { searchStudentsByUSN } from "@/lib/api/students";
import {
  getGroupAssignments,
  deleteAssignment,
  getAssignmentSubmissionCount,
  getAssignmentSubmissions,
} from "@/lib/api/assignments";
import { getGroupAnnouncements, Announcement } from "@/lib/api/announcements";
import {
  getGroupAttendanceStats,
  getGroupStudentAttendance,
} from "@/lib/api/attendance";
import {
  getGroupStudentGrades,
  StudentGradeData,
  GroupGradeStats,
} from "@/lib/api/grades-fixed";
import {
  getGroupRecentActivities,
  Activity as ActivityType,
  getActivityIcon,
  getRelativeTime,
} from "@/lib/api/activities";
import CreateAnnouncementModal from "@/components/announcements/create-announcement-modal";
import CreateAssignmentDialog from "@/components/assignments/create-assignment-dialog";
import AttendanceManagement from "@/components/attendance/attendance-management";
import StudentAttendanceView from "@/components/attendance/student-attendance-view";
import { Group, GroupMember, Student } from "@/types";
import AssignmentManagementTab from "@/components/assignments/assignment-management-tab";
import {
  ArrowLeft,
  Settings,
  UserPlus,
  Users,
  CheckCircle,
  FileText,
  TrendingUp,
  Calendar,
  GraduationCap,
  MoreHorizontal,
  Play,
  Download,
  Plus,
  Eye,
  Mail,
  Edit,
  Upload,
  Clock,
  Star,
  Search,
  Filter,
  QrCode,
  BarChart3,
  Trophy,
  AlertTriangle,
} from "lucide-react";

interface GroupDetailProps {
  groupId: string;
  groupDetails: Group | null;
  members: GroupMember[];
  initialTab?: string;
}

export default function GroupDetail({
  groupId,
  groupDetails: initialGroupDetails,
  members: initialMembers,
  initialTab = "overview",
}: GroupDetailProps) {
  const { user, role } = useUserStore();
  const { showToast } = useToast();
  // Use state for members if local modifications like removeStudent are needed
  const [group, setGroup] = useState<Group | null>(initialGroupDetails);
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [error, setError] = useState<string | null>(null); // For errors from actions like removeStudent
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Student search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState<string | null>(null);

  // Grade data state
  const [gradeData, setGradeData] = useState<GroupGradeStats | null>(null);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Attendance data state
  const [attendanceData, setAttendanceData] = useState<{
    averageAttendance: number;
    totalSessions: number;
    totalStudents: number;
  } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Student attendance data state
  const [studentAttendanceData, setStudentAttendanceData] = useState<any[]>([]);
  const [studentAttendanceLoading, setStudentAttendanceLoading] =
    useState(false);

  // Edit class form state
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    subject_code: "",
    department: "",
    semester: "",
    year: "",
    subject: "",
    pcl_group_no: "",
  });

  // Student data - use existing members as base, enhance with grades and attendance when available
  const students = members.map((member, index) => {
    // Try to find this member in grade data
    const gradeInfo = gradeData?.students.find(
      (gs) => gs.student_id === member.student_id
    );

    // Try to find this member in attendance data
    const attendanceInfo = studentAttendanceData.find(
      (sa) => sa.id === member.student_id
    );

    return {
      id: member.student_id || `student-${index}`,
      name: member.student?.name || member.name || `Student ${index + 1}`,
      email:
        member.student?.email ||
        member.email ||
        `student${index + 1}@university.edu`,
      studentId: member.student?.usn || member.usn || `CS202400${index + 1}`,
      // Use real GPA if available, otherwise show N/A
      gpa: gradeInfo ? gradeInfo.gpa.toFixed(1) : "N/A",
      averageScore: gradeInfo ? gradeInfo.average_score.toFixed(1) : null,
      // Use real attendance rate if available, otherwise show N/A
      attendanceRate: attendanceInfo ? attendanceInfo.attendanceRate : "N/A",
      assignmentsCompleted: gradeInfo ? gradeInfo.completed_assignments : 0,
      totalAssignments: gradeInfo ? gradeInfo.total_assignments : 0,
      completionRate: gradeInfo ? gradeInfo.completion_rate.toFixed(1) : null,
      // Use real last attended date if available, otherwise show Never
      lastActive:
        attendanceInfo && attendanceInfo.lastAttended !== "Never"
          ? attendanceInfo.lastAttended
          : "Never",
      hasRealGrades: !!gradeInfo, // Flag to know if we have real grade data
      hasRealAttendance: !!attendanceInfo, // Flag to know if we have real attendance data
    };
  });

  const mockAssignments = [
    {
      id: 1,
      title: "Binary Tree Implementation",
      type: "individual",
      status: "active",
      dueDate: "Aug 5, 2025",
      createdDate: "Jul 15, 2025",
      submissions: Math.floor(members.length * 0.8),
      totalStudents: members.length,
      maxScore: 100,
      averageGrade: 87,
      groupType: "Individual",
    },
    {
      id: 2,
      title: "Algorithm Analysis Project",
      type: "group",
      status: "active",
      dueDate: "Aug 10, 2025",
      createdDate: "Jul 20, 2025",
      submissions: Math.floor(members.length * 0.6),
      totalStudents: members.length,
      maxScore: 150,
      averageGrade: 0,
      groupType: "Team (3-4 members)",
    },
    {
      id: 3,
      title: "Data Structures Quiz",
      type: "individual",
      status: "completed",
      dueDate: "Jul 25, 2025",
      createdDate: "Jul 10, 2025",
      submissions: Math.floor(members.length * 0.95),
      totalStudents: members.length,
      maxScore: 50,
      averageGrade: 92,
      groupType: "Individual",
    },
    {
      id: 4,
      title: "System Design Presentation",
      type: "group",
      status: "draft",
      dueDate: "Aug 20, 2025",
      createdDate: "Jul 28, 2025",
      submissions: 0,
      totalStudents: members.length,
      maxScore: 200,
      averageGrade: 0,
      groupType: "Team (4-5 members)",
    },
  ];

  // Function to fetch assignments from database
  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const realAssignments = await getGroupAssignments(groupId);

      // Transform API data to match component format with real submission counts
      const transformedAssignments = await Promise.all(
        realAssignments.map(async (assignment) => {
          // Get real submission count for this assignment
          let submissionCount = 0;
          let averageGrade = 0;

          try {
            const submissionData = await getAssignmentSubmissionCount(
              assignment.id,
              groupId
            );
            submissionCount = submissionData.submitted;
            console.log(
              `Assignment ${assignment.title}: ${submissionCount}/${submissionData.total} submissions`
            );

            // Get detailed submissions to calculate average grade
            const submissions = await getAssignmentSubmissions(assignment.id);
            const gradedSubmissions = submissions.filter(
              (sub) => sub.total_score !== null && sub.total_score !== undefined
            );

            if (gradedSubmissions.length > 0) {
              const totalScore = gradedSubmissions.reduce(
                (sum, sub) => sum + (sub.total_score || 0),
                0
              );
              averageGrade = Math.round(
                (totalScore / gradedSubmissions.length / assignment.max_score) *
                  100
              );
              console.log(
                `Assignment ${assignment.title}: Average grade ${averageGrade}% (${gradedSubmissions.length} graded submissions)`
              );
            }
          } catch (error) {
            console.error(
              `Error fetching submissions for assignment ${assignment.id}:`,
              error
            );
          }

          return {
            id: assignment.id,
            title: assignment.title,
            type: assignment.type,
            status: assignment.status,
            dueDate: new Date(assignment.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            createdDate: new Date(assignment.created_at).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            ),
            submissions: submissionCount, // Real submission count from database
            totalStudents: members.length,
            maxScore: assignment.max_score,
            averageGrade: averageGrade, // Real average grade calculated from submissions
            groupType:
              assignment.type === "group"
                ? `Team (${assignment.group_size || 3}-${
                    assignment.group_size || 4
                  } members)`
                : "Individual",
          };
        })
      );

      setAssignments(transformedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      // Fallback to mock data if API fails
      setAssignments(mockAssignments);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Load assignments on component mount
  useEffect(() => {
    fetchAssignments();
  }, [groupId]);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    if (!groupId) return;

    setAnnouncementsLoading(true);
    try {
      const data = await getGroupAnnouncements(groupId);
      setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      showToast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // Fetch grade data
  const fetchGradeData = async () => {
    if (!groupId) return;

    setGradesLoading(true);
    try {
      const data = await getGroupStudentGrades(groupId);
      setGradeData(data);
      console.log("Grade data fetched:", data); // Debug log
    } catch (error) {
      console.error("Error fetching grade data:", error);
      // Don't show toast error for grades - just fall back to mock data
      setGradeData(null);
    } finally {
      setGradesLoading(false);
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    if (!groupId) return;

    setAttendanceLoading(true);
    try {
      const data = await getGroupAttendanceStats(groupId);
      setAttendanceData(data);
      console.log("Attendance data fetched:", data); // Debug log
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      // Don't show error toast for attendance, just use fallback
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch student attendance data
  const fetchStudentAttendanceData = async () => {
    if (!groupId) return;

    setStudentAttendanceLoading(true);
    try {
      console.log("Fetching student attendance data for group:", groupId);
      const data = await getGroupStudentAttendance(groupId);
      console.log("Student attendance data fetched:", data);
      setStudentAttendanceData(data);
    } catch (error) {
      console.error("Error fetching student attendance data:", error);
      // Don't show error toast, just set empty array
      setStudentAttendanceData([]);
    } finally {
      setStudentAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchGradeData();
    fetchAttendanceData();
    fetchStudentAttendanceData();
  }, [groupId]);

  // Fetch activities
  const fetchActivities = async () => {
    if (!groupId) return;

    setActivitiesLoading(true);
    try {
      console.log("Fetching activities for group:", groupId);
      const data = await getGroupRecentActivities(groupId, 5);
      console.log("Activities fetched for group", groupId, ":", data.length);
      setRecentActivities(data);
    } catch (error) {
      console.error("Error fetching activities:", error);
      // Don't show error toast for activities, just set empty array
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [groupId]);

  const handleAnnouncementCreated = () => {
    fetchAnnouncements(); // Refresh announcements after creating a new one
    fetchActivities(); // Also refresh activities
  };

  const handleAssignmentCreated = () => {
    fetchAssignments(); // Refresh assignments after creating a new one
    fetchGradeData(); // Refresh grade data as assignments affect GPA calculation
    fetchActivities(); // Also refresh activities
    fetchStudentAttendanceData(); // Refresh attendance as students might be active
  };

  const handleAssignmentRefresh = () => {
    fetchAssignments(); // Refresh assignments
    fetchGradeData(); // Refresh grade data as grading affects GPA
    fetchStudentAttendanceData(); // Refresh attendance data as well
  };

  // Update local state if props change (e.g., due to parent re-fetch)
  useEffect(() => {
    setGroup(initialGroupDetails);
  }, [initialGroupDetails]);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!groupId) return;

    setRemoveLoading(studentId);

    try {
      await removeStudentFromGroup(groupId, studentId);

      // Update the members list
      setMembers(members.filter((member) => member.student_id !== studentId));

      showToast({
        title: "Success",
        description: "Student removed from class successfully",
      });
    } catch (err: any) {
      setError(err.message || "Failed to remove student from group");
      showToast({
        title: "Error",
        description: err.message || "Failed to remove student from class",
        variant: "destructive",
      });
    } finally {
      setRemoveLoading(null);
    }
  };

  const handleSearchStudents = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchStudentsByUSN(searchTerm);

      // Filter out students already in the group
      const existingStudentIds = members.map((member) => member.student_id);
      const availableStudents = results.filter(
        (student: Student) => !existingStudentIds.includes(student.id)
      );

      setSearchResults(availableStudents);
    } catch (error) {
      console.error("Error searching students:", error);
      showToast({
        title: "Error",
        description: "Failed to search for students",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddStudentToGroup = async (studentId: string) => {
    if (!groupId) return;

    setAddingStudent(studentId);
    try {
      await addStudentToGroup(groupId, studentId);

      // Find the added student in search results
      const addedStudent = searchResults.find((s) => s.id === studentId);
      if (addedStudent) {
        // Create a new member object
        const newMember: GroupMember = {
          id: `member-${Date.now()}`, // Temporary ID
          group_id: groupId,
          student_id: studentId,
          name: addedStudent.name,
          email: addedStudent.email,
          usn: addedStudent.usn,
          class: addedStudent.class || "",
          semester: addedStudent.semester || "",
          group_usn: addedStudent.group_usn || "",
          joined_at: new Date().toISOString(),
          drive_links: [],
          student: {
            id: studentId,
            name: addedStudent.name,
            email: addedStudent.email,
            usn: addedStudent.usn,
            class: addedStudent.class || "",
            semester: addedStudent.semester || "",
            group_usn: addedStudent.group_usn || "",
          },
        };

        // Update the members list
        setMembers((prev) => [...prev, newMember]);

        // Remove from search results
        setSearchResults((prev) => prev.filter((s) => s.id !== studentId));
      }

      showToast({
        title: "Success",
        description: "Student added to class successfully",
      });

      // Clear search
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error adding student:", error);
      showToast({
        title: "Error",
        description: "Failed to add student to class",
        variant: "destructive",
      });
    } finally {
      setAddingStudent(null);
    }
  };

  const handleEditClass = () => {
    // Initialize form with current group data
    setEditForm({
      name: group?.name || "",
      description: group?.description || "",
      subject_code: group?.subject_code || "",
      department: group?.department || "",
      semester: group?.semester || "",
      year: group?.year || "",
      subject: group?.subject || "",
      pcl_group_no: group?.pcl_group_no || "",
    });
    setShowEditClass(true);
  };

  const handleSaveClassChanges = async () => {
    try {
      // Call the API to update the group
      const updatedGroup = await updateGroup(groupId, editForm);

      // Update local state with the response from the server
      if (updatedGroup) {
        setGroup(updatedGroup);
      }

      showToast({
        title: "Success",
        description: "Class details updated successfully",
      });

      setShowEditClass(false);
    } catch (error) {
      console.error("Error updating class:", error);
      showToast({
        title: "Error",
        description: "Failed to update class details",
        variant: "destructive",
      });
    }
  };

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  // Export student roster data to CSV
  const handleExportStudents = () => {
    try {
      // Prepare CSV headers
      const headers = [
        "Name",
        "Student ID",
        "Email",
        "GPA",
        "Attendance Rate (%)",
        "Assignments Completed",
        "Total Assignments",
        "Completion Rate (%)",
        "Last Active",
        "Data Source",
      ];

      // Prepare CSV data
      const csvData = students.map((student) => [
        student.name,
        student.studentId,
        student.email,
        student.gpa,
        student.attendanceRate,
        student.assignmentsCompleted,
        student.totalAssignments,
        Math.round(
          (student.assignmentsCompleted / student.totalAssignments) * 100
        ),
        student.lastActive,
        `Grades: ${student.hasRealGrades ? "Real" : "Mock"}, Attendance: ${
          student.hasRealAttendance ? "Real" : "Mock"
        }`,
      ]);

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `${group?.name || "class"}-student-roster-${
            new Date().toISOString().split("T")[0]
          }.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast({
          title: "Export Successful",
          description: `Student roster exported with ${students.length} students`,
        });
      }
    } catch (error) {
      console.error("Error exporting student data:", error);
      showToast({
        title: "Export Failed",
        description: "Failed to export student roster. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state is now handled by the parent server component (implicitly, or explicitly if passed as prop)
  // We check if group (derived from groupDetails prop) is null for 'not found' or error state from parent.

  if (error) {
    // This error state is now for local actions like removeStudent
    return (
      <div className="text-center p-8 text-red-500">
        <p>An error occurred: {error}</p>
        <p>Group data might be partially displayed or stale.</p>
      </div>
    );
  }

  if (!group) {
    // group is now derived from groupDetails prop
    return (
      <div className="text-center p-8">
        Group details not available. The group may not exist or there was an
        issue fetching its data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-chart-1/5 to-chart-2/5 rounded-lg border border-border">
        <div className="p-6">
          {/* Navigation */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard/faculty">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Classes
              </a>
            </Button>
            <span className="text-muted-foreground">›</span>
            <span className="text-foreground">
              {group.subject_code || "Class"} - {group.name}
            </span>
          </div>

          {/* Class Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Class Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl text-foreground">{group.name}</h1>
                {group.subject_code && (
                  <Badge variant="default" className="bg-chart-1 text-white">
                    {group.subject_code}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {group.department || "Department"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {group.semester && group.year
                      ? `${group.semester} ${group.year}`
                      : "Academic Year"}
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                {group.description ||
                  `Comprehensive study of ${
                    group.subject || group.name
                  }. Focus on practical applications and theoretical foundations.`}
              </p>
            </div>

            {/* Right: Action Buttons */}
            {role === "faculty" && (
              <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                <Button variant="outline" size="sm" onClick={handleEditClass}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Class
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddStudent(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Students
                </Button> */}
                <Button
                  size="sm"
                  className="bg-chart-2 hover:bg-chart-2/90 text-white"
                  onClick={() => setShowCreateAssignment(true)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:px-0 px-4">
        {/* Student Count Card */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Active enrollment</p>
          </CardContent>
        </Card>

        {/* Assignments Card */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Assignments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">
              {assignments.filter((a) => a.status === "active").length} active
            </p>
          </CardContent>
        </Card>

        {/* Average Grade Card */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Avg Grade</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gradesLoading
                ? "..."
                : gradeData
                ? `${gradeData.class_average_score.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              GPA:{" "}
              {gradesLoading
                ? "..."
                : gradeData
                ? gradeData.class_average_gpa.toFixed(1)
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceLoading
                ? "..."
                : attendanceData
                ? `${attendanceData.averageAttendance}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceData && attendanceData.totalSessions > 0
                ? `${attendanceData.totalSessions} sessions`
                : "Average rate"}
            </p>
          </CardContent>
        </Card>

        {/* Assignment Completion Card */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments.length > 0 && students.length > 0
                ? Math.round(
                    (students.reduce(
                      (sum, s) =>
                        sum +
                        (s.totalAssignments > 0
                          ? s.assignmentsCompleted / s.totalAssignments
                          : 0),
                      0
                    ) /
                      students.length) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Assignment rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabbed Content Section */}
      <Card className="bg-card border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border px-3 sm:px-6 pt-4">
            <div className="overflow-x-auto">
              <TabsList className="bg-muted w-full min-w-max grid grid-cols-6 lg:inline-flex lg:w-auto">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Home</span>
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Students</span>
                  <span className="sm:hidden">Students</span>
                </TabsTrigger>
                <TabsTrigger
                  value="assignments"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Assignments</span>
                  <span className="sm:hidden">Tasks</span>
                </TabsTrigger>
                <TabsTrigger
                  value="attendance"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <QrCode className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Attendance</span>
                  <span className="sm:hidden">Attend</span>
                </TabsTrigger>
                <TabsTrigger
                  value="announcements"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Announcements</span>
                  <span className="sm:hidden">News</span>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
                >
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activitiesLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading activities...
                      </div>
                    ) : recentActivities.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No recent activity in this class
                      </div>
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
                                  {activity.actor_name &&
                                    activity.actor_role === "student" && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        by {activity.actor_name}
                                      </p>
                                    )}
                                </div>
                                {activity.metadata?.priority && (
                                  <Badge
                                    variant={
                                      activity.metadata.priority === "high"
                                        ? "destructive"
                                        : activity.metadata.priority ===
                                          "normal"
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

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gradesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="text-sm text-muted-foreground">
                          Loading grades...
                        </div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="text-sm text-muted-foreground">
                          No students in group
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {students
                          .sort((a, b) => parseFloat(b.gpa) - parseFloat(a.gpa))
                          .slice(0, 3)
                          .map((student, index) => (
                            <div
                              key={student.id}
                              className="flex items-center gap-3"
                            >
                              <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full text-xs">
                                {index + 1}
                              </div>
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  {student.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  GPA: {student.gpa}
                                  {student.hasRealGrades && student.averageScore
                                    ? ` | Avg: ${student.averageScore}%`
                                    : ""}
                                </p>
                              </div>
                              <Badge variant="default">{student.gpa}</Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{assignment.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Due: {assignment.dueDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {assignment.submissions}/{assignment.totalStudents}{" "}
                          submitted
                        </div>
                        <Progress
                          value={
                            assignment.totalStudents > 0
                              ? (assignment.submissions /
                                  assignment.totalStudents) *
                                100
                              : 0
                          }
                          className="w-24 mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Roster</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportStudents}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Student to Class</DialogTitle>
                      <DialogDescription>
                        Search for students by USN or email to add them to this
                        class.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Search by USN or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleSearchStudents(searchTerm)}
                          disabled={searchLoading || !searchTerm.trim()}
                        >
                          {searchLoading ? "Searching..." : "Search"}
                        </Button>
                      </div>

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>USN</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {searchResults.map((student) => {
                                const isAlreadyMember = members.some(
                                  (member) => member.student_id === student.id
                                );

                                return (
                                  <TableRow key={student.id}>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">
                                          {student.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {student.email}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{student.usn}</TableCell>
                                    <TableCell>{student.class}</TableCell>
                                    <TableCell>
                                      {isAlreadyMember ? (
                                        <span className="text-muted-foreground text-sm">
                                          Already a member
                                        </span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleAddStudentToGroup(student.id)
                                          }
                                          disabled={
                                            addingStudent === student.id
                                          }
                                        >
                                          {addingStudent === student.id ? (
                                            "Adding..."
                                          ) : (
                                            <>
                                              <Plus className="h-3 w-3 mr-1" />
                                              Add
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {searchTerm &&
                        !searchLoading &&
                        searchResults.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            No students found matching &quot;{searchTerm}&quot;.
                            Try searching with a different USN or email.
                          </div>
                        )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              {/* Notice for missing attendance data */}
              {!students.some((s) => s.hasRealAttendance) && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-center">
                    <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-md">
                      📊 Start attendance sessions to track student attendance
                    </div>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {student.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {student.studentId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              parseFloat(student.gpa) >= 3.5
                                ? "default"
                                : "secondary"
                            }
                          >
                            {student.gpa}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {student.attendanceRate === "N/A" ? (
                              <span className="text-sm text-muted-foreground">
                                N/A
                              </span>
                            ) : (
                              <>
                                <Progress
                                  value={student.attendanceRate}
                                  className="w-16"
                                />
                                <span className="text-sm">
                                  {student.attendanceRate}%
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {student.totalAssignments === 0 ? (
                              <span className="text-muted-foreground">
                                No assignments
                              </span>
                            ) : (
                              <>
                                {student.assignmentsCompleted}/
                                {student.totalAssignments}
                                <div className="text-xs text-muted-foreground">
                                  {Math.round(
                                    (student.assignmentsCompleted /
                                      student.totalAssignments) *
                                      100
                                  )}
                                  % complete
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{student.lastActive}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                            {role === "faculty" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const member = members.find(
                                    (m) => m.student?.name === student.name
                                  );
                                  if (member?.student_id) {
                                    handleRemoveStudent(member.student_id);
                                  }
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="p-6 space-y-6">
            <AssignmentManagementTab
              groupId={groupId}
              assignments={assignments}
              totalStudents={members.length}
              onRefresh={handleAssignmentRefresh}
              isLoading={assignmentsLoading}
            />
          </TabsContent>

          <TabsContent value="announcements" className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Class Announcements
              </h2>
              <Button
                onClick={() => setShowAnnouncement(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </div>

            {/* Announcements list */}
            <div className="space-y-4">
              {announcementsLoading ? (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading announcements...
                </div>
              ) : announcements.length === 0 ? (
                <Card>
                  <CardContent className="text-center p-8">
                    <p className="text-gray-500">No announcements yet.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Create your first announcement for this class.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-base sm:text-lg">
                          {announcement.title}
                        </span>
                        <Badge
                          variant={
                            announcement.priority === "high"
                              ? "destructive"
                              : announcement.priority === "low"
                              ? "secondary"
                              : "default"
                          }
                          className="w-fit self-start sm:self-auto"
                        >
                          {announcement.priority}
                        </Badge>
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(announcement.created_at)}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">
                        {announcement.description}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="p-6 space-y-6">
            {role === "faculty" ? (
              <AttendanceManagement
                groupId={groupId}
                groupName={group?.name || "Unknown Group"}
              />
            ) : (
              <StudentAttendanceView
                groupId={groupId}
                groupName={group?.name || "Unknown Group"}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="p-6 space-y-6">
            {/* Analytics Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left Side */}
              <div>
                <h3 className="text-lg font-semibold">Class Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive performance insights for {group?.name}
                </p>
              </div>

              {/* Right Side */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportStudents}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Analytics
                </Button>

                <Select defaultValue="semester">
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="year">Academic Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Class Average GPA
                      </p>
                      <p className="text-2xl font-bold">
                        {gradesLoading
                          ? "..."
                          : gradeData
                          ? gradeData.class_average_gpa.toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      {students.filter((s) => s.hasRealGrades).length > 0
                        ? `${
                            students.filter((s) => s.hasRealGrades).length
                          } students`
                        : "No graded assignments"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Average Score
                      </p>
                      <p className="text-2xl font-bold">
                        {gradesLoading
                          ? "..."
                          : gradeData
                          ? `${gradeData.class_average_score.toFixed(1)}%`
                          : "N/A"}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      From{" "}
                      {
                        assignments.filter((a) => a.status === "completed")
                          .length
                      }{" "}
                      completed assignments
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Attendance Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {attendanceLoading
                          ? "..."
                          : attendanceData
                          ? `${attendanceData.averageAttendance}%`
                          : "N/A"}
                      </p>
                    </div>
                    <QrCode className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {attendanceData
                        ? `${attendanceData.totalSessions} sessions conducted`
                        : "No sessions yet"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Assignment Completion
                      </p>
                      <p className="text-2xl font-bold">
                        {assignments.length > 0
                          ? Math.round(
                              (students.reduce(
                                (sum, s) =>
                                  sum +
                                  (s.totalAssignments > 0
                                    ? s.assignmentsCompleted /
                                      s.totalAssignments
                                    : 0),
                                0
                              ) /
                                students.length) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <Play className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1" />
                      {assignments.length} total assignments
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Grade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gradesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-muted-foreground">
                        Loading grade data...
                      </div>
                    </div>
                  ) : !students.some((s) => s.hasRealGrades) ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No graded assignments yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Complete assignments to see grade distribution
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const studentsWithGrades = students.filter(
                          (s) => s.hasRealGrades && s.averageScore
                        );
                        const gradeRanges = [
                          {
                            range: "A (90-100%)",
                            min: 90,
                            max: 100,
                            color: "bg-green-500",
                          },
                          {
                            range: "B (80-89%)",
                            min: 80,
                            max: 89,
                            color: "bg-blue-500",
                          },
                          {
                            range: "C (70-79%)",
                            min: 70,
                            max: 79,
                            color: "bg-yellow-500",
                          },
                          {
                            range: "D (60-69%)",
                            min: 60,
                            max: 69,
                            color: "bg-orange-500",
                          },
                          {
                            range: "F (<60%)",
                            min: 0,
                            max: 59,
                            color: "bg-red-500",
                          },
                        ];

                        return gradeRanges.map((grade) => {
                          const studentsInRange = studentsWithGrades.filter(
                            (s) =>
                              parseFloat(s.averageScore || "0") >= grade.min &&
                              parseFloat(s.averageScore || "0") <= grade.max
                          ).length;
                          const percentage =
                            studentsWithGrades.length > 0
                              ? (studentsInRange / studentsWithGrades.length) *
                                100
                              : 0;

                          return (
                            <div key={grade.range}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{grade.range}</span>
                                <span>
                                  {studentsInRange} students (
                                  {percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${grade.color}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Assignment Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments.length === 0 ? (
                      <div className="text-center py-8">
                        <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No assignments created
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Create assignments to track progress
                        </p>
                      </div>
                    ) : (
                      <>
                        {[
                          {
                            status: "active",
                            label: "Active",
                            color: "bg-blue-500",
                          },
                          {
                            status: "completed",
                            label: "Completed",
                            color: "bg-green-500",
                          },
                          {
                            status: "draft",
                            label: "Draft",
                            color: "bg-gray-500",
                          },
                        ].map((statusType) => {
                          const count = assignments.filter(
                            (a) => a.status === statusType.status
                          ).length;
                          const percentage = (count / assignments.length) * 100;

                          return (
                            <div
                              key={statusType.status}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${statusType.color}`}
                                />
                                <span className="text-sm">
                                  {statusType.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {count}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <div className="pt-3 border-t">
                          <div className="text-sm font-medium mb-2">
                            Overall Submission Rate
                          </div>
                          <div className="space-y-2">
                            {assignments
                              .filter(
                                (a) =>
                                  a.status === "active" ||
                                  a.status === "completed"
                              )
                              .map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-xs text-muted-foreground truncate max-w-32">
                                    {assignment.title}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-muted rounded-full h-1.5">
                                      <div
                                        className="bg-blue-600 h-1.5 rounded-full"
                                        style={{
                                          width: `${
                                            assignment.totalStudents > 0
                                              ? (assignment.submissions /
                                                  assignment.totalStudents) *
                                                100
                                              : 0
                                          }%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground min-w-fit">
                                      {assignment.submissions}/
                                      {assignment.totalStudents}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No students enrolled
                        </p>
                      </div>
                    ) : (
                      <>
                        {students
                          .sort((a, b) => {
                            // Prioritize students with real grades, then sort by GPA
                            if (a.hasRealGrades && !b.hasRealGrades) return -1;
                            if (!a.hasRealGrades && b.hasRealGrades) return 1;

                            // Handle N/A GPA values
                            if (a.gpa === "N/A" && b.gpa === "N/A") return 0;
                            if (a.gpa === "N/A") return 1;
                            if (b.gpa === "N/A") return -1;

                            return parseFloat(b.gpa) - parseFloat(a.gpa);
                          })
                          .slice(0, 5)
                          .map((student, index) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0
                                      ? "bg-yellow-100 text-yellow-700"
                                      : index === 1
                                      ? "bg-gray-100 text-gray-700"
                                      : index === 2
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {student.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {student.hasRealGrades
                                      ? `${student.averageScore}% avg`
                                      : "No grades yet"}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default" className="text-xs">
                                {student.gpa}
                              </Badge>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-blue-600" />
                    Attendance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attendanceLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading attendance data...
                      </div>
                    ) : !attendanceData ||
                      attendanceData.totalSessions === 0 ? (
                      <div className="text-center py-4">
                        <QrCode className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No attendance sessions yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Start attendance tracking to see insights
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Overall Average</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  attendanceData.averageAttendance >= 85
                                    ? "bg-green-500"
                                    : attendanceData.averageAttendance >= 75
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${attendanceData.averageAttendance}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {attendanceData.averageAttendance}%
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Sessions</span>
                          <span className="text-sm font-medium">
                            {attendanceData.totalSessions}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Students Tracked</span>
                          <span className="text-sm font-medium">
                            {attendanceData.totalStudents}
                          </span>
                        </div>

                        {/* Attendance distribution */}
                        <div className="pt-3 border-t">
                          <div className="text-sm font-medium mb-2">
                            Attendance Categories
                          </div>
                          {[
                            {
                              label: "Excellent (≥90%)",
                              min: 90,
                              color: "bg-green-500",
                            },
                            {
                              label: "Good (80-89%)",
                              min: 80,
                              max: 89,
                              color: "bg-blue-500",
                            },
                            {
                              label: "Average (70-79%)",
                              min: 70,
                              max: 79,
                              color: "bg-yellow-500",
                            },
                            {
                              label: "Poor (<70%)",
                              min: 0,
                              max: 69,
                              color: "bg-red-500",
                            },
                          ].map((category) => {
                            const studentsInCategory = students.filter((s) => {
                              const rate = s.attendanceRate;
                              // Skip N/A values
                              if (rate === "N/A") return false;
                              const numericRate = parseFloat(rate);
                              return category.max
                                ? numericRate >= category.min &&
                                    numericRate <= category.max
                                : numericRate >= category.min;
                            }).length;
                            const percentage =
                              students.length > 0
                                ? (studentsInCategory / students.length) * 100
                                : 0;

                            return (
                              <div
                                key={category.label}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1">
                                  <div
                                    className={`w-2 h-2 rounded-full ${category.color}`}
                                  />
                                  <span>{category.label}</span>
                                </div>
                                <span>
                                  {studentsInCategory} ({percentage.toFixed(0)}
                                  %)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Class Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const insights = [];

                      // Grade insights
                      if (gradeData && gradeData.class_average_gpa > 0) {
                        const avgGPA = gradeData.class_average_gpa;
                        if (avgGPA >= 3.5) {
                          insights.push({
                            type: "positive",
                            title: "Excellent Academic Performance",
                            description: `Class GPA of ${avgGPA.toFixed(
                              2
                            )} shows strong performance`,
                            icon: CheckCircle,
                            color: "green",
                          });
                        } else if (avgGPA >= 3.0) {
                          insights.push({
                            type: "neutral",
                            title: "Good Academic Performance",
                            description: `Class GPA of ${avgGPA.toFixed(
                              2
                            )} is above average`,
                            icon: TrendingUp,
                            color: "blue",
                          });
                        } else {
                          insights.push({
                            type: "warning",
                            title: "Academic Support Needed",
                            description: `Class GPA of ${avgGPA.toFixed(
                              2
                            )} needs improvement`,
                            icon: AlertTriangle,
                            color: "orange",
                          });
                        }
                      }

                      // Attendance insights
                      if (
                        attendanceData &&
                        attendanceData.averageAttendance > 0
                      ) {
                        const avgAttendance = attendanceData.averageAttendance;
                        if (avgAttendance >= 85) {
                          insights.push({
                            type: "positive",
                            title: "Excellent Attendance",
                            description: `${avgAttendance}% average attendance rate`,
                            icon: QrCode,
                            color: "green",
                          });
                        } else if (avgAttendance >= 75) {
                          insights.push({
                            type: "warning",
                            title: "Attendance Needs Improvement",
                            description: `${avgAttendance}% attendance could be better`,
                            icon: AlertTriangle,
                            color: "orange",
                          });
                        }
                      }

                      // Assignment insights
                      const activeAssignments = assignments.filter(
                        (a) => a.status === "active"
                      ).length;
                      const completedAssignments = assignments.filter(
                        (a) => a.status === "completed"
                      ).length;

                      if (assignments.length > 0) {
                        insights.push({
                          type: "info",
                          title: "Assignment Progress",
                          description: `${completedAssignments} completed, ${activeAssignments} active assignments`,
                          icon: FileText,
                          color: "blue",
                        });
                      }

                      // Student engagement
                      const highPerformers = students.filter(
                        (s) => s.gpa !== "N/A" && parseFloat(s.gpa) >= 3.5
                      ).length;
                      if (highPerformers > 0) {
                        insights.push({
                          type: "positive",
                          title: "High Achievers",
                          description: `${highPerformers} students with GPA ≥ 3.5`,
                          icon: Trophy,
                          color: "yellow",
                        });
                      }

                      // Default message if no insights
                      if (insights.length === 0) {
                        insights.push({
                          type: "info",
                          title: "Getting Started",
                          description:
                            "Create assignments and track attendance for detailed insights",
                          icon: TrendingUp,
                          color: "gray",
                        });
                      }

                      return insights.map((insight, index) => {
                        const Icon = insight.icon;
                        const colorClasses: Record<string, string> = {
                          green: "bg-green-50 border-green-200 text-green-900",
                          orange:
                            "bg-orange-50 border-orange-200 text-orange-900",
                          blue: "bg-blue-50 border-blue-200 text-blue-900",
                          yellow:
                            "bg-yellow-50 border-yellow-200 text-yellow-900",
                          gray: "bg-gray-50 border-gray-200 text-gray-900",
                        };

                        const iconColors: Record<string, string> = {
                          green: "text-green-600",
                          orange: "text-orange-600",
                          blue: "text-blue-600",
                          yellow: "text-yellow-600",
                          gray: "text-gray-600",
                        };

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              colorClasses[insight.color]
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon
                                className={`h-4 w-4 mt-0.5 ${
                                  iconColors[insight.color]
                                }`}
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {insight.title}
                                </p>
                                <p className="text-xs opacity-75">
                                  {insight.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Student Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Student Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No students enrolled in this class
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>GPA</TableHead>
                          <TableHead>Avg Score</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Assignments</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students
                          .sort((a, b) => {
                            // Sort by real grades first, then by GPA
                            if (a.hasRealGrades && !b.hasRealGrades) return -1;
                            if (!a.hasRealGrades && b.hasRealGrades) return 1;
                            return parseFloat(b.gpa) - parseFloat(a.gpa);
                          })
                          .map((student, index) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index < 3
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs">
                                      {student.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {student.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    student.hasRealGrades
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {student.gpa}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {student.hasRealGrades &&
                                student.averageScore ? (
                                  `${student.averageScore}%`
                                ) : (
                                  <span className="text-muted-foreground">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-12 bg-muted rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        student.attendanceRate >= 85
                                          ? "bg-green-500"
                                          : student.attendanceRate >= 75
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{
                                        width: `${student.attendanceRate}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs">
                                    {student.attendanceRate}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {student.assignmentsCompleted}/
                                  {student.totalAssignments}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    parseFloat(student.gpa) >= 3.5 &&
                                    student.attendanceRate >= 85
                                      ? "default"
                                      : parseFloat(student.gpa) >= 3.0 &&
                                        student.attendanceRate >= 75
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {parseFloat(student.gpa) >= 3.5 &&
                                  student.attendanceRate >= 85
                                    ? "Excellent"
                                    : parseFloat(student.gpa) >= 3.0 &&
                                      student.attendanceRate >= 75
                                    ? "Good"
                                    : "Needs Support"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Edit Class Dialog */}
      <Dialog open={showEditClass} onOpenChange={setShowEditClass}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Class Details</DialogTitle>
            <DialogDescription>
              Update the information for this class.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter class name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectCode">Subject Code</Label>
              <Input
                id="subjectCode"
                value={editForm.subject_code}
                onChange={(e) =>
                  setEditForm({ ...editForm, subject_code: e.target.value })
                }
                placeholder="e.g., CS101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={editForm.department}
                onChange={(e) =>
                  setEditForm({ ...editForm, department: e.target.value })
                }
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={editForm.subject}
                onChange={(e) =>
                  setEditForm({ ...editForm, subject: e.target.value })
                }
                placeholder="e.g., Data Structures"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                value={editForm.semester}
                onChange={(e) =>
                  setEditForm({ ...editForm, semester: e.target.value })
                }
                placeholder="e.g., Fall, Spring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={editForm.year}
                onChange={(e) =>
                  setEditForm({ ...editForm, year: e.target.value })
                }
                placeholder="e.g., 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pclGroupNo">PCL Group Number</Label>
              <Input
                id="pclGroupNo"
                value={editForm.pcl_group_no}
                onChange={(e) =>
                  setEditForm({ ...editForm, pcl_group_no: e.target.value })
                }
                placeholder="e.g., 1, 2, 3"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Class description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditClass(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClassChanges}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Student Details
            </DialogTitle>
            <DialogDescription className="text-sm">
              Detailed information about {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 sm:space-y-6">
              {/* Student Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Avatar className="w-12 h-12 mx-auto sm:mx-0">
                      <AvatarFallback className="text-lg">
                        {selectedStudent.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {selectedStudent.email}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm font-medium">Student ID</Label>
                      <p className="font-mono text-sm">
                        {selectedStudent.studentId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">GPA</Label>
                      <p className="text-sm">{selectedStudent.gpa}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Attendance Rate
                      </Label>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={selectedStudent.attendanceRate}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium">
                          {selectedStudent.attendanceRate}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Active</Label>
                      <p className="text-sm">{selectedStudent.lastActive}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Completed Assignments</span>
                        <span className="font-medium">
                          {selectedStudent.assignmentsCompleted}/
                          {selectedStudent.totalAssignments}
                        </span>
                      </div>
                      <Progress
                        value={
                          (selectedStudent.assignmentsCompleted /
                            selectedStudent.totalAssignments) *
                          100
                        }
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completion rate:{" "}
                      <span className="font-medium">
                        {Math.round(
                          (selectedStudent.assignmentsCompleted /
                            selectedStudent.totalAssignments) *
                            100
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1 text-sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" className="flex-1 text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Submissions
                </Button>
                <Button variant="outline" className="flex-1 text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Assignment Modal */}
      <CreateAssignmentDialog
        open={showCreateAssignment}
        onOpenChange={setShowCreateAssignment}
        groupId={groupId}
        totalStudents={members.length}
        onAssignmentCreated={handleAssignmentCreated}
      />

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        isOpen={showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        groupId={groupId}
        facultyId={user?.id || ""}
        onAnnouncementCreated={handleAnnouncementCreated}
      />
    </div>
  );
}
