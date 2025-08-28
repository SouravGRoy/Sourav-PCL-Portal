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
import { useUserStore } from "@/lib/store";
import { getGroupAssignments } from "@/lib/api/assignments";
import { getStudentSubmissions } from "@/lib/api/student-submissions";
import { getGroupAnnouncements, Announcement } from "@/lib/api/announcements";
import {
  getStudentAssignmentGroup,
  StudentAssignmentGroup,
} from "@/lib/api/student-assignment-groups";
import GroupMembersModal from "@/components/assignments/group-members-modal";
import StudentAttendanceView from "@/components/attendance/student-attendance-view";
import { Group, GroupMember } from "@/types";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  FileText,
  Calendar,
  ExternalLink,
  Clock,
  Megaphone,
  QrCode,
} from "lucide-react";

interface StudentGroupDetailProps {
  groupId: string;
  groupDetails: Group | null;
  members: GroupMember[];
  initialTab?: string;
}

export default function StudentGroupDetail({
  groupId,
  groupDetails: initialGroupDetails,
  members: initialMembers,
  initialTab = "overview",
}: StudentGroupDetailProps) {
  console.log("🎯 StudentGroupDetail COMPONENT MOUNTING:", groupId);
  const { user } = useUserStore();
  const { showToast } = useToast();

  const [group, setGroup] = useState<Group | null>(initialGroupDetails);
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedGroup, setSelectedGroup] =
    useState<StudentAssignmentGroup | null>(null);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] =
    useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log(
      "🚀 StudentGroupDetail useEffect STARTING for groupId:",
      groupId
    );

    const fetchData = async () => {
      try {
        console.log(
          "🔍 StudentGroupDetail: Fetching assignments for group:",
          groupId
        );

        setAssignmentsLoading(true);
        setAnnouncementsLoading(true);

        // Fetch assignments for the group
        const assignmentsData = await getGroupAssignments(groupId);
        console.log("✅ Assignments fetched:", assignmentsData);

        // Fetch assignment group information for each assignment
        const assignmentsWithGroups = await Promise.all(
          assignmentsData.map(async (assignment) => {
            let assignmentGroup = null;
            if (user?.id) {
              assignmentGroup = await getStudentAssignmentGroup(
                assignment.id,
                user.id
              );
            }
            return {
              ...assignment,
              assignmentGroup,
            };
          })
        );

        setAssignments(assignmentsWithGroups);

        // Fetch user's submissions if user is available
        if (user?.id) {
          console.log("🔍 Fetching submissions for user:", user.id);
          const submissionsData = await getStudentSubmissions(user.id);
          console.log("✅ Submissions fetched:", submissionsData);

          // Filter submissions for this group's assignments
          const groupSubmissions = submissionsData.filter((sub) =>
            assignmentsWithGroups.some(
              (assignment) => assignment.id === sub.assignment_id
            )
          );
          setSubmissions(groupSubmissions);
        }

        // Fetch announcements for the group
        try {
          console.log("🔍 Fetching announcements for group:", groupId);
          const announcementsData = await getGroupAnnouncements(groupId);
          console.log("✅ Announcements fetched:", announcementsData);
          setAnnouncements(announcementsData);
        } catch (announcementError) {
          console.error("❌ Error fetching announcements:", announcementError);
          // Don't fail the whole component if announcements fail
          setAnnouncements([]);
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        // Just log the error, don't set network error state
      } finally {
        setAssignmentsLoading(false);
        setAnnouncementsLoading(false);
      }
    };

    fetchData();
  }, [groupId, user?.id]); // Simple dependencies

  const handleGroupClick = (
    group: StudentAssignmentGroup,
    assignmentTitle: string
  ) => {
    setSelectedGroup(group);
    setSelectedAssignmentTitle(assignmentTitle);
    setIsModalOpen(true);
  };

  // Simple retry function
  const handleRetry = () => {
    setAssignmentsLoading(true);
    window.location.reload(); // Simple page refresh
  };

  if (!group) {
    return <div className="text-center p-8">Group not found</div>;
  }

  const completedAssignments = assignments.filter((assignment) =>
    submissions.some((sub) => sub.assignment_id === assignment.id)
  );

  const pendingAssignments = assignments.filter(
    (assignment) =>
      !submissions.some((sub) => sub.assignment_id === assignment.id)
  );

  const completionRate =
    assignments.length > 0
      ? (completedAssignments.length / assignments.length) * 100
      : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <p className="text-gray-600">{group.description}</p>
          </div>
        </div>
        <Badge variant="secondary">{group.department}</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedAssignments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingAssignments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(completionRate)}%
            </div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="overflow-x-auto">
          <TabsList className="bg-muted w-full min-w-max grid grid-cols-5 lg:inline-flex lg:w-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
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
              <span className="sm:hidden">Attendance</span>
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
              value="members"
              className="data-[state=active]:bg-background text-xs sm:text-sm whitespace-nowrap"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Members</span>
              <span className="sm:hidden">Members</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Information */}
            <Card>
              <CardHeader>
                <CardTitle>Group Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Faculty</p>
                  <p className="text-lg">
                    {group.faculty_name || "Unknown Faculty"}
                  </p>
                </div>

                {group.subject_code && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Subject Code
                    </p>
                    <p>{group.subject_code}</p>
                  </div>
                )}

                {group.subject && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Subject</p>
                    <p>{group.subject}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Department
                  </p>
                  <p>{group.department}</p>
                </div>

                {group.semester && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Semester
                    </p>
                    <p>{group.semester}</p>
                  </div>
                )}

                {group.year && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Year</p>
                    <p>{group.year}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    PCL Group No
                  </p>
                  <p>{group.pcl_group_no}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Members</p>
                  <p>{members.length} students</p>
                </div>

                {group.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">
                      Description
                    </p>
                    <p className="text-sm">{group.description}</p>
                  </div>
                )}

                {group.drive_link && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">
                      Group Drive
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={group.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Drive
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Loading assignments...
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-gray-500">No assignments yet</p>
                ) : (
                  <div className="space-y-3">
                    {assignments.slice(0, 5).map((assignment) => {
                      const isSubmitted = submissions.some(
                        (sub) => sub.assignment_id === assignment.id
                      );
                      const isOverdue =
                        new Date(assignment.due_date) < new Date();

                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-gray-500">
                              Due: {formatDate(assignment.due_date)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              isSubmitted
                                ? "default"
                                : isOverdue
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {isSubmitted
                              ? "Submitted"
                              : isOverdue
                              ? "Overdue"
                              : "Pending"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>
                View and submit assignments for this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    Loading assignments...
                  </div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No assignments available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const submission = submissions.find(
                      (sub) => sub.assignment_id === assignment.id
                    );
                    const isOverdue =
                      new Date(assignment.due_date) < new Date();

                    return (
                      <Card
                        key={assignment.id}
                        className="border-l-4 border-l-blue-400"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {assignment.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {assignment.assignmentGroup && (
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                                  onClick={() =>
                                    handleGroupClick(
                                      assignment.assignmentGroup,
                                      assignment.title
                                    )
                                  }
                                >
                                  <Users className="h-3 w-3" />
                                  {assignment.assignmentGroup.group_name}
                                </Badge>
                              )}
                              <Badge
                                variant={
                                  submission
                                    ? "default"
                                    : isOverdue
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {submission
                                  ? "Submitted"
                                  : isOverdue
                                  ? "Overdue"
                                  : "Pending"}
                              </Badge>
                            </div>
                          </div>
                          <CardDescription>
                            Due: {formatDateTime(assignment.due_date)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-4">
                            {assignment.description ||
                              "No description provided"}
                          </p>
                          <div className="flex space-x-2">
                            <Button asChild>
                              <a href={`/assignments/${assignment.id}`}>
                                View Details
                              </a>
                            </Button>
                            {!submission && (
                              <Button variant="outline" asChild>
                                <a
                                  href={`/assignments/${assignment.id}/submit`}
                                >
                                  Submit Assignment
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Group Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Semester</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.student?.name || member.name}
                      </TableCell>
                      <TableCell>{member.student?.usn || member.usn}</TableCell>
                      <TableCell>
                        {member.student?.class || member.class}
                      </TableCell>
                      <TableCell>
                        {member.student?.semester || member.semester}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <StudentAttendanceView
            groupId={groupId}
            groupName={group?.name || "Unknown Group"}
          />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Megaphone className="h-5 w-5 mr-2" />
                Class Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="text-center py-4">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No announcements yet
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">
                            {announcement.title}
                          </h3>
                          <Badge
                            variant={
                              announcement.priority === "high"
                                ? "destructive"
                                : announcement.priority === "normal"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-3">
                          {announcement.description}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDateTime(announcement.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GroupMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={selectedGroup}
        assignmentTitle={selectedAssignmentTitle}
      />
    </div>
  );
}
