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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Download,
  Eye,
  Edit,
  Plus,
  Filter,
  Search,
} from "lucide-react";
import { useUserStore } from "@/lib/store";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import {
  getStudentAssignments,
  getAssignmentDetails,
} from "@/lib/api/assignments";
import {
  getStudentSubmissions,
  getStudentSubmissionForAssignment,
  createStudentSubmission,
  updateStudentSubmission,
} from "@/lib/api/student-submissions";
import Link from "next/link";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: "individual" | "group";
  status: "draft" | "active" | "completed" | "archived";
  max_score: number;
  due_date: string;
  created_at: string;
  group_id: string;
  group_size?: number;
  allow_late_submission: boolean;
  late_submission_penalty: number;
  assignment_rubrics?: GradingRubric[];
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text?: string;
  submission_url?: string;
  file_attachments?: any[];
  submitted_at: string;
  is_late: boolean;
  total_score?: number;
  feedback?: string;
  status: "draft" | "submitted" | "graded" | "returned";
}

interface GradingRubric {
  id: string;
  criteria_name: string;
  criteria_description?: string;
  max_points: number;
  order_index: number;
}

export default function EnhancedStudentAssignments() {
  const { user } = useUserStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    text: "",
    url: "",
    files: [] as File[],
  });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch assignments for the student
      const assignmentsData = await getStudentAssignments(user.id);
      setAssignments(assignmentsData);

      // Fetch submissions for each assignment
      const submissionsData: Record<string, Submission> = {};

      for (const assignment of assignmentsData) {
        const submission = await getStudentSubmissionForAssignment(
          user.id,
          assignment.id
        );
        if (submission) {
          submissionsData[assignment.id] = submission;
        }
      }

      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = submissions[assignment.id];
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isOverdue = now > dueDate;

    if (submission) {
      switch (submission.status) {
        case "graded":
          return { status: "graded", color: "bg-green-500", text: "Graded" };
        case "submitted":
          return {
            status: "submitted",
            color: "bg-blue-500",
            text: "Submitted",
          };
        case "draft":
          return { status: "draft", color: "bg-yellow-500", text: "Draft" };
        default:
          return {
            status: "returned",
            color: "bg-purple-500",
            text: "Returned",
          };
      }
    }

    if (isOverdue && assignment.status === "active") {
      return { status: "overdue", color: "bg-red-500", text: "Overdue" };
    }

    if (assignment.status === "active") {
      return { status: "pending", color: "bg-orange-500", text: "Pending" };
    }

    return { status: "inactive", color: "bg-gray-500", text: "Inactive" };
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const openSubmissionDialog = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);

    // Load full assignment details including rubrics
    try {
      const fullAssignment = await getAssignmentDetails(assignment.id);
      setSelectedAssignment(fullAssignment);
    } catch (error) {
      console.error("Error loading assignment details:", error);
    }

    // Load existing submission if any
    const existingSubmission = submissions[assignment.id];
    if (existingSubmission) {
      setSubmissionForm({
        text: existingSubmission.submission_text || "",
        url: existingSubmission.submission_url || "",
        files: [],
      });
    }

    setShowSubmissionDialog(true);
  };

  const handleSubmission = async () => {
    if (!selectedAssignment || !user) return;

    try {
      const existingSubmission = submissions[selectedAssignment.id];
      const submissionData = {
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        submission_text: submissionForm.text,
        submission_url: submissionForm.url,
        file_attachments: submissionForm.files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      };

      if (existingSubmission) {
        // Update existing submission
        await updateStudentSubmission(existingSubmission.id, submissionData);
      } else {
        // Create new submission
        await createStudentSubmission(submissionData);
      }

      toast({
        title: "Success",
        description: "Assignment submitted successfully!",
      });

      setShowSubmissionDialog(false);
      setSubmissionForm({ text: "", url: "", files: [] });
      fetchAssignments(); // Refresh data
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;

    const assignmentStatus = getAssignmentStatus(assignment);
    return matchesSearch && assignmentStatus.status === filterStatus;
  });

  const groupedAssignments = {
    pending: filteredAssignments.filter((a) => {
      const status = getAssignmentStatus(a);
      return status.status === "pending" || status.status === "overdue";
    }),
    submitted: filteredAssignments.filter((a) => {
      const status = getAssignmentStatus(a);
      return status.status === "submitted";
    }),
    graded: filteredAssignments.filter((a) => {
      const status = getAssignmentStatus(a);
      return status.status === "graded";
    }),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {groupedAssignments.pending.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groupedAssignments.submitted.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <Star className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groupedAssignments.graded.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({groupedAssignments.pending.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({groupedAssignments.submitted.length})
          </TabsTrigger>
          <TabsTrigger value="graded">
            Graded ({groupedAssignments.graded.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Assignments */}
        <TabsContent value="pending" className="space-y-4">
          {groupedAssignments.pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  All caught up!
                </h3>
                <p className="text-gray-500 text-center">
                  You don't have any pending assignments right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groupedAssignments.pending.map((assignment) => {
                const status = getAssignmentStatus(assignment);
                const daysUntilDue = getDaysUntilDue(assignment.due_date);

                return (
                  <Card
                    key={assignment.id}
                    className="border-l-4 border-l-orange-400"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {assignment.title}
                            <Badge
                              variant="outline"
                              className={`${status.color} text-white`}
                            >
                              {status.text}
                            </Badge>
                            {assignment.type === "group" && (
                              <Badge variant="secondary">Group</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Due: {formatDate(assignment.due_date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {daysUntilDue > 0
                                  ? `${daysUntilDue} days left`
                                  : "Overdue"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                {assignment.max_score} points
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {assignment.description || "No description provided"}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openSubmissionDialog(assignment)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Assignment
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/assignments/${assignment.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Submitted Assignments */}
        <TabsContent value="submitted" className="space-y-4">
          {groupedAssignments.submitted.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Upload className="h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  No submissions yet
                </h3>
                <p className="text-gray-500 text-center">
                  Your submitted assignments will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groupedAssignments.submitted.map((assignment) => {
                const submission = submissions[assignment.id];

                return (
                  <Card
                    key={assignment.id}
                    className="border-l-4 border-l-blue-400"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {assignment.title}
                            <Badge className="bg-blue-500 text-white">
                              Submitted
                            </Badge>
                            {assignment.type === "group" && (
                              <Badge variant="secondary">Group</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Submitted:{" "}
                                {submission
                                  ? new Date(
                                      submission.submitted_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                {assignment.max_score} points
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Waiting for faculty review...
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" asChild>
                          <Link href={`/submissions/${assignment.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Submission
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openSubmissionDialog(assignment)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Submission
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Graded Assignments */}
        <TabsContent value="graded" className="space-y-4">
          {groupedAssignments.graded.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Star className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  No grades yet
                </h3>
                <p className="text-gray-500 text-center">
                  Your graded assignments will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groupedAssignments.graded.map((assignment) => {
                const submission = submissions[assignment.id];
                const scorePercentage = submission?.total_score
                  ? Math.round(
                      (submission.total_score / assignment.max_score) * 100
                    )
                  : 0;

                return (
                  <Card
                    key={assignment.id}
                    className="border-l-4 border-l-green-400"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {assignment.title}
                            <Badge className="bg-green-500 text-white">
                              Graded
                            </Badge>
                            {assignment.type === "group" && (
                              <Badge variant="secondary">Group</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                Score: {submission?.total_score || 0} /{" "}
                                {assignment.max_score} ({scorePercentage}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Graded:{" "}
                                {submission
                                  ? new Date(
                                      submission.submitted_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {submission?.feedback && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            Faculty Feedback:
                          </h4>
                          <p className="text-sm text-gray-600">
                            {submission.feedback}
                          </p>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <Button variant="outline" asChild>
                          <Link href={`/submissions/${assignment.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Graded Submission
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submission Dialog */}
      <Dialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Submit Assignment: {selectedAssignment?.title}
            </DialogTitle>
            <DialogDescription>
              Submit your work for this assignment. Make sure to review all
              requirements before submitting.
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-6">
              {/* Assignment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Due Date
                      </Label>
                      <p className="text-sm">
                        {new Date(selectedAssignment.due_date).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Max Score
                      </Label>
                      <p className="text-sm">
                        {selectedAssignment.max_score} points
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Type
                      </Label>
                      <p className="text-sm capitalize">
                        {selectedAssignment.type}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Late Submission
                      </Label>
                      <p className="text-sm">
                        {selectedAssignment.allow_late_submission
                          ? `Allowed (${selectedAssignment.late_submission_penalty}% penalty)`
                          : "Not allowed"}
                      </p>
                    </div>
                  </div>

                  {selectedAssignment.instructions && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Instructions
                      </Label>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedAssignment.instructions}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rubric */}
              {selectedAssignment.assignment_rubrics &&
                selectedAssignment.assignment_rubrics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Grading Rubric</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Criteria</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">
                              Max Points
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedAssignment.assignment_rubrics
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((rubric) => (
                              <TableRow key={rubric.id}>
                                <TableCell className="font-medium">
                                  {rubric.criteria_name}
                                </TableCell>
                                <TableCell>
                                  {rubric.criteria_description ||
                                    "No description"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {rubric.max_points}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

              {/* Submission Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="submission-text">Written Response</Label>
                    <Textarea
                      id="submission-text"
                      placeholder="Enter your assignment response here..."
                      value={submissionForm.text}
                      onChange={(e) =>
                        setSubmissionForm((prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="submission-url">
                      Drive Link (if applicable)
                    </Label>
                    <Input
                      id="submission-url"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={submissionForm.url}
                      onChange={(e) =>
                        setSubmissionForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="file-upload">File Attachments</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Upload files or drag and drop
                          </span>
                          <span className="mt-1 block text-sm text-gray-500">
                            PDF, DOC, DOCX, PNG, JPG up to 10MB each
                          </span>
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setSubmissionForm((prev) => ({ ...prev, files }));
                          }}
                        />
                      </div>
                    </div>
                    {submissionForm.files.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {submissionForm.files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSubmissionForm((prev) => ({
                                  ...prev,
                                  files: prev.files.filter(
                                    (_, i) => i !== index
                                  ),
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmissionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmission}>Submit Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
