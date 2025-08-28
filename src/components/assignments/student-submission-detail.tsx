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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Star,
  Clock,
  CheckCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import { useUserStore } from "@/lib/store";
import { getSubmissionById } from "@/lib/api/student-submissions";
import Link from "next/link";

interface SubmissionDetailProps {
  submissionId: string;
  assignmentId: string;
  onBack: () => void;
}

interface DetailedSubmission {
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
  assignment: {
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    max_score: number;
    due_date: string;
    type: "individual" | "group";
    assignment_rubrics: Array<{
      id: string;
      criteria_name: string;
      criteria_description?: string;
      max_points: number;
      order_index: number;
    }>;
  };
  submission_scores: Array<{
    score: number;
    feedback?: string;
    rubric: {
      criteria_name: string;
      max_points: number;
    };
  }>;
}

export default function StudentSubmissionDetail({
  submissionId,
  assignmentId,
  onBack,
}: SubmissionDetailProps) {
  const { user } = useUserStore();
  const [submission, setSubmission] = useState<DetailedSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      setIsLoading(true);
      const data = await getSubmissionById(submissionId);
      setSubmission(data);
    } catch (err: any) {
      console.error("Error fetching submission details:", err);
      setError(err.message || "Failed to load submission details");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "graded") {
      return <Badge className="bg-green-500">Graded</Badge>;
    }
    if (status === "submitted") {
      return isLate ? (
        <Badge className="bg-orange-500">Submitted Late</Badge>
      ) : (
        <Badge className="bg-blue-500">Submitted</Badge>
      );
    }
    if (status === "returned") {
      return <Badge className="bg-purple-500">Returned</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  const calculateGradePercentage = () => {
    if (!submission?.total_score || !submission.assignment.max_score) return 0;
    return Math.round(
      (submission.total_score / submission.assignment.max_score) * 100
    );
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading submission...</span>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error || "Submission not found"}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const gradePercentage = calculateGradePercentage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {submission.assignment.title}
            </h1>
            <p className="text-gray-600">Submission Details</p>
          </div>
        </div>
        {getStatusBadge(submission.status, submission.is_late)}
      </div>

      {/* Assignment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assignment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Due Date</p>
              <p className="text-sm text-gray-600">
                {new Date(submission.assignment.due_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Max Score</p>
              <p className="text-sm text-gray-600">
                {submission.assignment.max_score} points
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Type</p>
              <p className="text-sm text-gray-600 capitalize">
                {submission.assignment.type}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Submitted</p>
              <p className="text-sm text-gray-600">
                {new Date(submission.submitted_at).toLocaleDateString()}
                {submission.is_late && (
                  <span className="text-orange-600 ml-2">(Late)</span>
                )}
              </p>
            </div>
          </div>

          {submission.assignment.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Description
              </p>
              <p className="text-sm text-gray-600">
                {submission.assignment.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Summary */}
      {submission.status === "graded" &&
        submission.total_score !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Grade Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${getGradeColor(
                      gradePercentage
                    )}`}
                  >
                    {submission.total_score} / {submission.assignment.max_score}
                  </div>
                  <p className="text-sm text-gray-600">Total Score</p>
                </div>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${getGradeColor(
                      gradePercentage
                    )}`}
                  >
                    {gradePercentage}%
                  </div>
                  <p className="text-sm text-gray-600">Percentage</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-700">
                    {gradePercentage >= 90
                      ? "A"
                      : gradePercentage >= 80
                      ? "B"
                      : gradePercentage >= 70
                      ? "C"
                      : gradePercentage >= 60
                      ? "D"
                      : "F"}
                  </div>
                  <p className="text-sm text-gray-600">Letter Grade</p>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={gradePercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

      {/* Rubric Breakdown */}
      {submission.status === "graded" &&
        submission.submission_scores &&
        submission.submission_scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Rubric Feedback</CardTitle>
              <CardDescription>
                Score breakdown by evaluation criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Max Points</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.submission_scores.map((score, index) => {
                    const percentage = Math.round(
                      (score.score / score.rubric.max_points) * 100
                    );
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {score.rubric.criteria_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getGradeColor(percentage)}>
                            {score.score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {score.rubric.max_points}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getGradeColor(percentage)}>
                            {percentage}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {score.feedback || "No specific feedback"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Faculty Feedback */}
      {submission.feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">
                {submission.feedback}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Submission */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submission</CardTitle>
          <CardDescription>
            What you submitted for this assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.submission_text && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Written Response
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {submission.submission_text}
                </p>
              </div>
            </div>
          )}

          {submission.submission_url && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Submission Link
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={submission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Link
                  </a>
                </Button>
                <span className="text-sm text-gray-500">
                  {submission.submission_url}
                </span>
              </div>
            </div>
          )}

          {submission.file_attachments &&
            submission.file_attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  File Attachments
                </p>
                <div className="space-y-2">
                  {submission.file_attachments.map(
                    (file: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            (
                            {file.size
                              ? `${Math.round(file.size / 1024)} KB`
                              : "Unknown size"}
                            )
                          </span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {!submission.submission_text &&
            !submission.submission_url &&
            (!submission.file_attachments ||
              submission.file_attachments.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No submission content found</p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/assignments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Link>
        </Button>
        {submission.status !== "graded" && (
          <Button asChild>
            <Link href={`/assignments/${assignmentId}/submit`}>
              Edit Submission
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
