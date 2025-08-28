"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store";
import { getStudentSubmissionForAssignment } from "@/lib/api/submissions";
import { formatDateTime } from "@/lib/date-utils";
import { Assignment } from "@/types";

interface AssignmentClientProps {
  assignmentId: string;
  initialAssignment: Assignment; // Server component ensures this is non-null or calls notFound()
}

export default function AssignmentClient({
  assignmentId,
  initialAssignment,
}: AssignmentClientProps) {
  const router = useRouter();
  const { user, role } = useUserStore();

  // initialAssignment is guaranteed by the server component, so we can set it directly.
  const [assignment, setAssignment] = useState<Assignment>(initialAssignment);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoadingSubmissionStatus, setIsLoadingSubmissionStatus] =
    useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update local assignment state if initialAssignment prop changes (though typically it won't for a given page load)
    setAssignment(initialAssignment);
  }, [initialAssignment]);

  useEffect(() => {
    const checkSubmissionStatus = async () => {
      if (!user || role !== "student" || !assignmentId) {
        setIsLoadingSubmissionStatus(false);
        return;
      }

      try {
        const submission = await getStudentSubmissionForAssignment(
          user.id,
          assignmentId
        );
        setHasSubmitted(!!submission);
      } catch (err: any) {
        console.error("Failed to check submission status:", err);
        setError(err.message || "Failed to check submission status");
      } finally {
        setIsLoadingSubmissionStatus(false);
      }
    };

    if (role === "student" && assignmentId) {
      checkSubmissionStatus();
    } else {
      setIsLoadingSubmissionStatus(false);
    }
  }, [assignmentId, user, role]); // Rerun if these change

  if (error) {
    return (
      <MainLayout>
        <div className="text-center p-8 text-red-500">Error: {error}</div>
      </MainLayout>
    );
  }

  const isPastDue = assignment.due_date
    ? new Date(assignment.due_date) < new Date()
    : false;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold break-words">{assignment.title}</h1>
          {role === "faculty" && (
            <Button variant="outline" asChild>
              <a href={`/assignments/${assignmentId}/submissions`}>
                View Submissions
              </a>
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>
              Due:{" "}
              {assignment.due_date
                ? formatDateTime(assignment.due_date)
                : "N/A"}
              {isPastDue && (
                <span className="ml-2 font-semibold text-red-600">
                  (Past Due)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: assignment.description || "" }}
            />
          </CardContent>
        </Card>

        {role === "student" && (
          <>
            {isLoadingSubmissionStatus ? (
              <div className="text-center p-4">
                Loading submission status...
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Your Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasSubmitted ? (
                    <div className="text-green-600 font-semibold">
                      <p>You have submitted this assignment.</p>
                      {/* Consider adding a link to view/edit submission if applicable */}
                    </div>
                  ) : (
                    <div>
                      <p
                        className={
                          isPastDue ? "text-red-600" : "text-yellow-600"
                        }
                      >
                        {isPastDue
                          ? "This assignment is past due. Submissions may no longer be accepted."
                          : "You have not submitted this assignment yet."}
                      </p>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button
                      onClick={() =>
                        router.push(`/assignments/${assignmentId}/submit`)
                      }
                      disabled={isPastDue && hasSubmitted} // Or just isPastDue if no updates allowed past due
                    >
                      {hasSubmitted
                        ? "View/Update Submission"
                        : "Submit Assignment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
