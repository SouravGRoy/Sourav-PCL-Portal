import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, AlertTriangle, Users, FileText, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { deleteAssignment, getAssignmentDetails } from "@/lib/api/assignments";

interface DeleteAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  assignmentTitle?: string;
  onAssignmentDeleted?: () => void;
}

interface AssignmentInfo {
  id: string;
  title: string;
  description?: string;
  type: "individual" | "group";
  due_date: string;
  status: "draft" | "active" | "completed" | "archived";
  submission_count: number;
  group_count?: number;
  max_score: number;
}

export default function DeleteAssignmentDialog({
  open,
  onOpenChange,
  assignmentId,
  assignmentTitle,
  onAssignmentDeleted,
}: DeleteAssignmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentInfo, setAssignmentInfo] = useState<AssignmentInfo | null>(
    null
  );
  const { showToast } = useToast();

  // Load assignment info when dialog opens
  useEffect(() => {
    if (open && assignmentId) {
      loadAssignmentInfo(assignmentId);
    }
  }, [open, assignmentId]);

  const loadAssignmentInfo = async (id: string) => {
    try {
      setIsLoading(true);

      const assignment = await getAssignmentDetails(id);

      const info: AssignmentInfo = {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        due_date: assignment.due_date,
        status: assignment.status,
        submission_count: 0, // TODO: Get actual submission count
        group_count: undefined,
        max_score: assignment.max_score,
      };

      setAssignmentInfo(info);
    } catch (error) {
      console.error("Error loading assignment info:", error);
      showToast({
        title: "Error",
        description: "Failed to load assignment information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!assignmentId) return;

    try {
      setIsDeleting(true);

      await deleteAssignment(assignmentId);

      showToast({
        title: "Success",
        description: "Assignment deleted successfully",
      });

      // Call the callback to refresh the assignments list
      if (onAssignmentDeleted) {
        onAssignmentDeleted();
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      showToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete assignment",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

  const hasSubmissions = assignmentInfo && assignmentInfo.submission_count > 0;
  const isActive = assignmentInfo?.status === "active";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Assignment
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the assignment details
            before proceeding.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : assignmentInfo ? (
          <div className="space-y-4">
            {/* Assignment Info Card */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="font-medium text-lg">
                    {assignmentInfo.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {assignmentInfo.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(assignmentInfo.status)}>
                    {assignmentInfo.status.charAt(0).toUpperCase() +
                      assignmentInfo.status.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {assignmentInfo.type.charAt(0).toUpperCase() +
                      assignmentInfo.type.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due:{" "}
                    {new Date(assignmentInfo.due_date).toLocaleDateString()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Max Score:</span>
                    <div className="font-medium">
                      {assignmentInfo.max_score} points
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submissions:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {assignmentInfo.submission_count}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Alerts */}
            {hasSubmissions && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Warning:</strong> This assignment has{" "}
                  {assignmentInfo.submission_count} student submissions.
                  Deleting it will permanently remove all submission data and
                  grades.
                </AlertDescription>
              </Alert>
            )}

            {isActive && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Active Assignment:</strong> This assignment is
                  currently active. Students may still be working on their
                  submissions.
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Permanent Action:</strong> This action cannot be undone.
                All assignment data, submissions, grades, and associated records
                will be permanently deleted.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load assignment information
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Assignment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
