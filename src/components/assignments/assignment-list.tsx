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
import { getGroupAssignments } from "@/lib/api/assignments";
import { formatDateTime } from "@/lib/date-utils";
import { Assignment } from "@/types";

interface AssignmentListProps {
  groupId: string;
}

export default function AssignmentList({ groupId }: AssignmentListProps) {
  const { user, role } = useUserStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!groupId) return;

      try {
        const assignmentsData = await getGroupAssignments(groupId);
        setAssignments(assignmentsData);
      } catch (err: any) {
        setError(err.message || "Failed to load assignments");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [groupId]);

  if (isLoading) {
    return <div className="text-center p-8">Loading assignments...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assignments</h1>
        {role === "faculty" && (
          <Button asChild>
            <a href={`/groups/${groupId}/assignments/create`}>Add Assignment</a>
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No assignments have been created for this group yet.
          </p>
          {role === "faculty" && (
            <Button asChild className="mt-4">
              <a href={`/groups/${groupId}/assignments/create`}>
                Create First Assignment
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
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
                    <a href={`/assignments/${assignment.id}`}>View Details</a>
                  </Button>
                  {role === "student" && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/assignments/${assignment.id}/submit`}>
                        Submit Assignment
                      </a>
                    </Button>
                  )}
                  {role === "faculty" && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/assignments/${assignment.id}/submissions`}>
                        View Submissions
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
