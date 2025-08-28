import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Users,
  FileText,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  GraduationCap,
} from "lucide-react";
import {
  getAssignmentDetails,
  getSubmissionStats,
} from "@/lib/api/assignments";

interface ViewAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  userRole?: "faculty" | "student";
  onEditAssignment?: (assignmentId: string) => void;
  onGradeAssignment?: (assignmentId: string) => void;
}

interface AssignmentDetails {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: "individual" | "group";
  due_date: string;
  created_at: string;
  max_score: number;
  status: "draft" | "active" | "completed" | "archived";
  group_size?: number;
  group_formation_type?: "random" | "manual";
  submission_count: number;
  graded_count: number;
  average_score?: number;
  assignment_rubrics: Array<{
    id: string;
    criteria_name: string;
    criteria_description?: string;
    max_points: number;
    order_index: number;
  }>;
}

interface SubmissionStats {
  total_students: number;
  submitted: number;
  graded: number;
  pending: number;
  late_submissions: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
}

export default function ViewAssignmentDialog({
  open,
  onOpenChange,
  assignmentId,
  userRole = "student",
  onEditAssignment,
  onGradeAssignment,
}: ViewAssignmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  // Load assignment data when dialog opens
  useEffect(() => {
    if (open && assignmentId) {
      loadAssignmentData(assignmentId);
    }
  }, [open, assignmentId]);

  const loadAssignmentData = async (id: string) => {
    try {
      setIsLoading(true);

      const assignmentData = await getAssignmentDetails(id);
      const submissionStats = await getSubmissionStats(id);

      setAssignment(assignmentData);
      setStats(submissionStats);
    } catch (error) {
      console.error("Error loading assignment data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Assignment</DialogTitle>
            <DialogDescription>
              Please wait while we load the assignment details...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!assignment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assignment Not Found</DialogTitle>
            <DialogDescription>
              The requested assignment could not be found or loaded.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Assignment not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Title & Description */}
            <div className="space-y-2">
              <DialogTitle className="text-xl sm:text-2xl">
                {assignment.title}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {assignment.description}
              </DialogDescription>
            </div>

            {/* Action Buttons (only faculty) */}
            {userRole === "faculty" && (
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditAssignment?.(assignment.id)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => onGradeAssignment?.(assignment.id)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <GraduationCap className="h-4 w-4" />
                  Grade
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Assignment Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Due Date</p>
              <p
                className={`font-medium ${
                  isOverdue(assignment.due_date) ? "text-red-600" : ""
                }`}
              >
                {formatDate(assignment.due_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{assignment.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-muted-foreground">Max Score</p>
              <p className="font-medium">{assignment.max_score} points</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(assignment.status)}>
              {assignment.status.charAt(0).toUpperCase() +
                assignment.status.slice(1)}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Instructions</TabsTrigger>
            <TabsTrigger value="rubric">Rubric</TabsTrigger>
            {userRole === "faculty" && (
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            )}
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignment Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {assignment.instructions ||
                      "No detailed instructions provided."}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {assignment.type === "group" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Group Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Group Size
                      </p>
                      <p className="font-medium">
                        {assignment.group_size} students
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Formation Type
                      </p>
                      <p className="font-medium capitalize">
                        {assignment.group_formation_type} assignment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rubric" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grading Rubric</CardTitle>
                <DialogDescription>
                  This assignment will be graded based on the following
                  criteria:
                </DialogDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignment.assignment_rubrics
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((criteria) => (
                      <div key={criteria.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">
                            {criteria.criteria_name}
                          </h4>
                          <Badge variant="outline">
                            {criteria.max_points} points
                          </Badge>
                        </div>
                        {criteria.criteria_description && (
                          <p className="text-sm text-muted-foreground">
                            {criteria.criteria_description}
                          </p>
                        )}
                      </div>
                    ))}

                  <div className="border-t my-4"></div>

                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Points:</span>
                    <span>
                      {assignment.assignment_rubrics.reduce(
                        (sum, c) => sum + c.max_points,
                        0
                      )}{" "}
                      points
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {userRole === "faculty" && stats && (
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{stats.submitted}</p>
                        <p className="text-sm text-muted-foreground">
                          Submissions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{stats.graded}</p>
                        <p className="text-sm text-muted-foreground">Graded</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">{stats.pending}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Submission Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Submitted</span>
                      <span>
                        {stats.submitted}/{stats.total_students}
                      </span>
                    </div>
                    <Progress
                      value={(stats.submitted / stats.total_students) * 100}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Graded</span>
                      <span>
                        {stats.graded}/{stats.submitted}
                      </span>
                    </div>
                    <Progress
                      value={(stats.graded / stats.submitted) * 100}
                      className="bg-blue-100"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Score Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.highest_score}
                      </p>
                      <p className="text-sm text-muted-foreground">Highest</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats.average_score.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {stats.lowest_score}
                      </p>
                      <p className="text-sm text-muted-foreground">Lowest</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Submissions Received</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.submission_count} out of{" "}
                          {stats?.total_students || 25} students
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {assignment.submission_count}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Graded Submissions</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.graded_count} submissions have been graded
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{assignment.graded_count}</Badge>
                  </div>

                  {stats && stats.late_submissions > 0 && (
                    <div className="flex items-center justify-between p-3 border rounded-lg border-orange-200">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Late Submissions</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted after the due date
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-orange-200">
                        {stats.late_submissions}
                      </Badge>
                    </div>
                  )}

                  {userRole === "faculty" && (
                    <Button
                      className="w-full"
                      onClick={() => onGradeAssignment?.(assignment.id)}
                    >
                      View All Submissions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
