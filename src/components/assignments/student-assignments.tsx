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
import { supabase } from "@/lib/supabase";
import { getStudentAssignments } from "@/lib/api/assignments";
import { getStudentSubmissionForAssignment } from "@/lib/api/student-submissions";
import {
  getStudentAssignmentGroup,
  StudentAssignmentGroup,
} from "@/lib/api/student-assignment-groups";
import GroupMembersModal from "@/components/assignments/group-members-modal";
import { Assignment } from "@/types";
import { formatDateTime } from "@/lib/date-utils";
import Link from "next/link";
import { Users } from "lucide-react";

export default function StudentAssignments() {
  const { user } = useUserStore();
  const [assignments, setAssignments] = useState<
    (Assignment & { assignmentGroup?: StudentAssignmentGroup | null })[]
  >([]);
  const [submittedAssignments, setSubmittedAssignments] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] =
    useState<StudentAssignmentGroup | null>(null);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] =
    useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;

      try {
        // Fetch all assignments for the student
        const assignmentsData = await getStudentAssignments(user.id);

        // Fetch group information for each assignment
        const assignmentsWithGroups = await Promise.all(
          assignmentsData.map(async (assignment) => {
            const assignmentGroup = await getStudentAssignmentGroup(
              assignment.id,
              user.id
            );
            return {
              ...assignment,
              assignmentGroup,
            };
          })
        );

        setAssignments(assignmentsWithGroups);

        // Get the student profile ID for the current user
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          // Check submissions for each assignment using auth user ID
          const submissionChecks = await Promise.all(
            assignmentsWithGroups.map(async (assignment) => {
              const submission = await getStudentSubmissionForAssignment(
                user.id, // Use auth user ID (profiles.id) instead of student profile ID
                assignment.id
              );
              return submission ? assignment.id : null;
            })
          );

          const submitted = submissionChecks.filter((id) => id !== null);
          setSubmittedAssignments(submitted);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load assignments");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
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
    return <div className="text-center p-8">Loading assignments...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  // Separate assignments into pending and submitted
  const pendingAssignments = assignments.filter(
    (a) => !submittedAssignments.includes(a.id)
  );
  const completedAssignments = assignments.filter((a) =>
    submittedAssignments.includes(a.id)
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Assignments</h1>

      {assignments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            You don&apos;t have any assignments yet.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Join a group to get assignments.
          </p>
          <Button asChild className="mt-4">
            <Link href="/groups/join">Join Groups</Link>
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Pending Assignments ({pendingAssignments.length})
            </h2>
            {pendingAssignments.length === 0 ? (
              <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">
                No pending assignments. Great job!
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingAssignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className="border-l-4 border-l-yellow-400"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{assignment.title}</CardTitle>
                        {assignment.assignmentGroup && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                            onClick={() =>
                              handleGroupClick(
                                assignment.assignmentGroup!,
                                assignment.title
                              )
                            }
                          >
                            <Users className="h-3 w-3" />
                            {assignment.assignmentGroup.group_name}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Due: {formatDateTime(assignment.due_date)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-4">
                        {assignment.description || "No description provided"}
                      </p>
                      <div className="flex space-x-2">
                        <Button asChild>
                          <a href={`/assignments/${assignment.id}/submit`}>
                            Submit Assignment
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/assignments/${assignment.id}`}>
                            View Details
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">
              Completed Assignments ({completedAssignments.length})
            </h2>
            {completedAssignments.length === 0 ? (
              <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">
                You haven&apos;t completed any assignments yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {completedAssignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className="border-l-4 border-l-green-400"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{assignment.title}</CardTitle>
                        {assignment.assignmentGroup && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                            onClick={() =>
                              handleGroupClick(
                                assignment.assignmentGroup!,
                                assignment.title
                              )
                            }
                          >
                            <Users className="h-3 w-3" />
                            {assignment.assignmentGroup.group_name}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Due: {formatDateTime(assignment.due_date)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-4">
                        {assignment.description || "No description provided"}
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/submissions/assignment/${assignment.id}`}>
                            View Submission
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
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
