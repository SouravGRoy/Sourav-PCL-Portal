import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store";
import { getAssignmentSubmissions } from "@/lib/api/submissions";
import { getAssignmentById } from "@/lib/api/assignments";
import { Assignment } from "@/types";
import { formatDateTime } from "@/lib/date-utils";

interface FacultySubmissionsListProps {
  assignmentId: string;
}

export default function FacultySubmissionsList({
  assignmentId,
}: FacultySubmissionsListProps) {
  const { user } = useUserStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!assignmentId) return;

      try {
        // Fetch assignment details
        const assignmentData = await getAssignmentById(assignmentId);
        setAssignment(assignmentData);

        // Fetch all submissions for the assignment
        const submissionsData = await getAssignmentSubmissions(assignmentId);
        setSubmissions(submissionsData);
      } catch (err: any) {
        setError(err.message || "Failed to load submissions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [assignmentId]);

  if (isLoading) {
    return <div className="text-center p-8">Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {assignment?.title || "Assignment"} Submissions
          </h1>
          <p className="text-gray-600 mt-2">
            Due: {assignment ? formatDateTime(assignment.due_date) : "Unknown"}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/groups/${assignment?.group_id}/assignments`}>
            ← Back to Assignments
          </a>
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No submissions yet
            </h3>
            <p className="text-gray-500">
              Students haven&apos;t submitted this assignment yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-900">
                Submission Summary
              </h2>
              <span className="text-2xl font-bold text-blue-900">
                {submissions.length}
              </span>
            </div>
            <p className="text-blue-700 mt-1">
              {submissions.filter((s) => s.status === "graded").length} graded,{" "}
              {submissions.filter((s) => s.status !== "graded").length} pending
              review
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className={`border-l-4 hover:shadow-md transition-shadow ${
                  submission.status === "graded"
                    ? "border-l-green-500 bg-green-50"
                    : "border-l-yellow-500 bg-yellow-50"
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {submission.profiles?.student_profiles?.[0]?.name ||
                          "Unknown Student"}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        USN:{" "}
                        {submission.profiles?.student_profiles?.[0]?.usn ||
                          "N/A"}{" "}
                        • Submitted: {formatDateTime(submission.submitted_at)}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        submission.status === "graded"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {submission.status === "graded"
                        ? "Graded"
                        : "Pending Review"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Submission Link
                    </h4>
                    <a
                      href={submission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {submission.submission_url}
                    </a>
                  </div>

                  {submission.status === "graded" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {submission.total_score !== null && (
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">
                            Score
                          </h4>
                          <p className="text-2xl font-bold text-green-600">
                            {submission.total_score} /{" "}
                            {(assignment as any)?.max_score || 100}
                          </p>
                        </div>
                      )}

                      {submission.feedback && (
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Feedback
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {submission.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={submission.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Submission
                      </a>
                    </Button>
                    <Button asChild size="sm">
                      <a href={`/submissions/${submission.id}/review`}>
                        {submission.status === "graded"
                          ? "Edit Grade"
                          : "Grade & Feedback"}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
