import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Users,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";

interface Assignment {
  id: number;
  title: string;
  type: string;
  status: string;
  dueDate: string;
  createdDate: string;
  submissions: number;
  totalStudents: number;
  maxScore: number;
  averageGrade: number;
  groupType: string;
  studentGroup?: {
    id: string;
    group_name: string;
    group_number: number;
    members: Array<{
      id: string;
      student: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  };
}

interface EnhancedAssignmentListProps {
  assignments: Assignment[];
  onCreateAssignment: () => void;
  searchTerm: string;
  filterStatus: string;
  isLoading?: boolean;
  onViewAssignment?: (assignmentId: string) => void;
  onEditAssignment?: (assignmentId: string) => void;
  onDeleteAssignment?: (assignmentId: string) => void;
  onGradeAssignment?: (assignmentId: string) => void;
  userRole?: string;
  currentStudentId?: string;
}

// Group Info Modal Component
function GroupInfoModal({
  assignment,
  currentStudentId,
}: {
  assignment: Assignment;
  currentStudentId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadGroupData = async () => {
    if (!currentStudentId || assignment.type !== "group") return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-student-group",
          assignmentId: assignment.id.toString(),
          studentId: currentStudentId,
        }),
      });

      const result = await response.json();
      setGroupData(result.group);
    } catch (error) {
      console.error("Error loading group data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGroupData();
    }
  }, [isOpen]);

  if (assignment.type !== "group") return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          {assignment.studentGroup?.group_name || "View Group"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Group Information</DialogTitle>
          <DialogDescription>
            Your group for &quot;{assignment.title}&quot;
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : groupData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{groupData.group_name}</Badge>
              <span className="text-sm text-muted-foreground">
                {groupData.members.length} members
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Group Members:</h4>
              <div className="space-y-2">
                {groupData.members.map((member: any) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 p-2 rounded-md ${
                      member.student_id === currentStudentId
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">
                      {member.student?.name}
                      {member.student_id === currentStudentId && " (You)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>You haven&apos;t been assigned to a group yet.</p>
            <p className="text-sm mt-2">
              Groups will be formed by your instructor.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EnhancedAssignmentList({
  assignments,
  onCreateAssignment,
  searchTerm,
  filterStatus,
  isLoading = false,
  onViewAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onGradeAssignment,
  userRole = "student",
  currentStudentId,
}: EnhancedAssignmentListProps) {
  // State to manage dropdown menus for each assignment
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>(
    {}
  );

  // Cleanup dropdown state when component unmounts or assignments change
  useEffect(() => {
    return () => {
      setOpenDropdowns({});
    };
  }, [assignments]);

  // Handle dropdown state change
  const handleDropdownChange = (assignmentId: number, isOpen: boolean) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [assignmentId]: isOpen,
    }));
  };

  // Handle edit assignment with proper dropdown cleanup
  const handleEditAssignment = (
    assignmentId: string,
    event?: React.MouseEvent
  ) => {
    // Prevent event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Close the dropdown first
    setOpenDropdowns((prev) => ({
      ...prev,
      [parseInt(assignmentId)]: false,
    }));
    // Add a small delay to ensure dropdown closes before opening edit dialog
    setTimeout(() => {
      onEditAssignment?.(assignmentId);
    }, 50);
  };

  // Handle delete assignment with proper dropdown cleanup
  const handleDeleteAssignment = (
    assignmentId: string,
    event?: React.MouseEvent
  ) => {
    // Prevent event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Close the dropdown first
    setOpenDropdowns((prev) => ({
      ...prev,
      [parseInt(assignmentId)]: false,
    }));
    // Add a small delay to ensure dropdown closes before opening delete dialog
    setTimeout(() => {
      onDeleteAssignment?.(assignmentId);
    }, 50);
  };
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-muted-foreground">
          Loading assignments...
        </h3>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
        <p className="text-muted-foreground mb-4">
          {searchTerm || filterStatus !== "all"
            ? "Try adjusting your search or filters"
            : "Get started by creating your first assignment"}
        </p>
        {!searchTerm && filterStatus === "all" && (
          <Button onClick={onCreateAssignment}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Assignment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-base line-clamp-2">
                  {assignment.title}
                </h4>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant={
                      assignment.status === "active"
                        ? "default"
                        : assignment.status === "completed"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {assignment.status}
                  </Badge>
                  {assignment.type && (
                    <Badge variant="outline" className="text-xs">
                      {assignment.type}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Due: {assignment.dueDate}</p>
                <p>{assignment.submissions} submissions</p>
                <p>Max Score: {assignment.maxScore || 100}</p>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{assignment.groupType || "Individual"}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {assignment.submissions}/{assignment.totalStudents}
                  </span>
                </div>
                <Progress
                  value={
                    (assignment.submissions / assignment.totalStudents) * 100
                  }
                  className="h-1.5"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {userRole === "faculty" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() =>
                          onViewAssignment?.(assignment.id.toString())
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() =>
                          onGradeAssignment?.(assignment.id.toString())
                        }
                      >
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Grade
                      </Button>
                    </div>
                    <DropdownMenu
                      open={openDropdowns[assignment.id] || false}
                      onOpenChange={(isOpen) =>
                        handleDropdownChange(assignment.id, isOpen)
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs h-8"
                        >
                          <MoreHorizontal className="h-3 w-3 mr-1" />
                          More
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleEditAssignment(assignment.id.toString(), e)
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Assignment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleDeleteAssignment(assignment.id.toString(), e)
                          }
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="space-y-2">
                    {/* Group Information for Group Assignments */}
                    {assignment.type === "group" && (
                      <GroupInfoModal
                        assignment={assignment}
                        currentStudentId={currentStudentId}
                      />
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() =>
                          onViewAssignment?.(assignment.id.toString())
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
