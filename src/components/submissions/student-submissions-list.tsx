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
import { useUserStore } from "@/lib/store";
import { getStudentSubmissions } from "@/lib/api/submissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date-utils";
import {
  getStudentAssignmentGroup,
  StudentAssignmentGroup,
} from "@/lib/api/student-assignment-groups";
import GroupMembersModal from "@/components/assignments/group-members-modal";
import Link from "next/link";
import { Users } from "lucide-react";

export default function StudentSubmissionsList() {
  const { user } = useUserStore();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] =
    useState<StudentAssignmentGroup | null>(null);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] =
    useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;

      try {
        // Fetch all submissions for the student
        const submissionsData = await getStudentSubmissions(user.id);

        // Fetch assignment details for each submission
        const enhancedSubmissions = await Promise.all(
          submissionsData.map(async (submission) => {
            const { data: assignment } = await supabase
              .from("assignments")
              .select("*")
              .eq("id", submission.assignment_id)
              .single();

            // Check if this assignment has groups (is a group assignment)
            let assignmentGroup = null;
            if (assignment && user) {
              assignmentGroup = await getStudentAssignmentGroup(
                assignment.id,
                user.id
              );
            }

            return {
              ...submission,
              assignment,
              assignmentGroup,
            };
          })
        );

        setSubmissions(enhancedSubmissions);
      } catch (err: any) {
        setError(err.message || "Failed to load submissions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  const handleGroupClick = (
    group: StudentAssignmentGroup,
    assignmentTitle: string
  ) => {
    setSelectedGroup(group);
    setSelectedAssignmentTitle(assignmentTitle);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Submissions</h1>

      {submissions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            You haven&apos;t submitted any assignments yet.
          </p>
          <Button asChild className="mt-4">
            <Link href="/assignments/my">View Assignments</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className={`border-l-4 ${
                submission.status === "reviewed"
                  ? "border-l-green-400"
                  : "border-l-yellow-400"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {submission.assignment?.title || "Assignment"}
                  </CardTitle>
                  {submission.assignmentGroup && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                      onClick={() =>
                        handleGroupClick(
                          submission.assignmentGroup,
                          submission.assignment?.title || "Assignment"
                        )
                      }
                    >
                      <Users className="h-3 w-3" />
                      {submission.assignmentGroup.group_name}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Submitted: {formatDateTime(submission.submitted_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Submission URL:</p>
                    <a
                      href={submission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline break-all"
                    >
                      {submission.url}
                    </a>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Status:</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        submission.status === "reviewed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {submission.status === "reviewed"
                        ? "Reviewed"
                        : "Pending Review"}
                    </span>
                  </div>

                  {submission.status === "reviewed" && submission.feedback && (
                    <div>
                      <p className="text-sm font-medium">Feedback:</p>
                      <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                        {submission.feedback}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/assignments/${submission.assignment_id}`}>
                        View Assignment
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/assignments/${submission.assignment_id}/submit`}
                      >
                        Update Submission
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={selectedGroup}
        assignmentTitle={selectedAssignmentTitle}
      />
    </div>
  );
}
