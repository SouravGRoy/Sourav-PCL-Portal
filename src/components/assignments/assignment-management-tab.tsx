import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AssignmentStatsCards from "./assignment-stats-cards";
import AssignmentFilters from "./assignment-filters";
import EnhancedAssignmentList from "./enhanced-assignment-list";
import CreateAssignmentDialog from "./create-assignment-dialog";
import EditAssignmentDialog from "./edit-assignment-dialog";
import DeleteAssignmentDialog from "./delete-assignment-dialog";
import ViewAssignmentDialog from "./view-assignment-dialog";
import { getAssignmentDetails } from "@/lib/api/assignments";

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
}

interface AssignmentManagementTabProps {
  groupId: string;
  assignments: Assignment[];
  totalStudents: number;
  onRefresh?: () => void; // Add refresh callback
  isLoading?: boolean; // Add loading state
}

export default function AssignmentManagementTab({
  groupId,
  assignments,
  totalStudents,
  onRefresh,
  isLoading = false,
}: AssignmentManagementTabProps) {
  const router = useRouter();
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [showDeleteAssignment, setShowDeleteAssignment] = useState(false);
  const [showViewAssignment, setShowViewAssignment] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] =
    useState<string>("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState("");

  // Filter assignments based on search and status
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title
      .toLowerCase()
      .includes(assignmentSearchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || assignment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Faculty action handlers
  const handleViewAssignment = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setShowViewAssignment(true);
  };

  const handleEditAssignment = (assignmentId: string) => {
    // Close view dialog if it's open to prevent conflicts
    setShowViewAssignment(false);
    // Reset any previous state
    setSelectedAssignmentId(null);
    // Set new assignment and open edit dialog
    setTimeout(() => {
      setSelectedAssignmentId(assignmentId);
      setShowEditAssignment(true);
    }, 100);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    // Find the assignment title from the assignments list
    const assignment = assignments.find(
      (a) => a.id.toString() === assignmentId
    );
    setSelectedAssignmentId(assignmentId);
    setSelectedAssignmentTitle(assignment?.title || "Unknown Assignment");
    setShowDeleteAssignment(true);
  };

  const handleGradeAssignment = (assignmentId: string) => {
    // Close any open dialogs before navigating
    setShowViewAssignment(false);
    setShowEditAssignment(false);
    setSelectedAssignmentId(null);
    router.push(`/assignments/${assignmentId}/grade?groupId=${groupId}`);
  };

  const handleAssignmentUpdated = () => {
    // Close all dialogs and reset state
    setShowViewAssignment(false);
    setShowEditAssignment(false);
    setShowDeleteAssignment(false);
    setSelectedAssignmentId(null);
    setSelectedAssignmentTitle("");

    // Refresh the assignments list
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handle closing view dialog and reset state
  const handleCloseViewDialog = (open: boolean) => {
    setShowViewAssignment(open);
    if (!open) {
      setSelectedAssignmentId(null); // Reset selected assignment when closing
    }
  };

  // Handle closing edit dialog and reset state
  const handleCloseEditDialog = (open: boolean) => {
    setShowEditAssignment(open);
    if (!open) {
      // Add delay to ensure proper cleanup
      setTimeout(() => {
        setSelectedAssignmentId(null);
      }, 100);
    }
  };

  // Handle closing delete dialog and reset state
  const handleCloseDeleteDialog = (open: boolean) => {
    setShowDeleteAssignment(open);
    if (!open) {
      setSelectedAssignmentId(null); // Reset selected assignment when closing
      setSelectedAssignmentTitle("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Management Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Assignment Management</h3>
          <p className="text-sm text-muted-foreground">
            Create, manage, and grade assignments
          </p>
        </div>
        <Button
          onClick={() => setShowCreateAssignment(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Quick Stats Cards */}
      <AssignmentStatsCards assignments={assignments} />

      <AssignmentFilters
        searchTerm={assignmentSearchTerm}
        onSearchChange={setAssignmentSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
      />

      {/* Filters and Search */}

      {/* Assignment List */}
      <EnhancedAssignmentList
        assignments={filteredAssignments}
        onCreateAssignment={() => setShowCreateAssignment(true)}
        searchTerm={assignmentSearchTerm}
        filterStatus={filterStatus}
        isLoading={isLoading}
        userRole="faculty"
        onViewAssignment={handleViewAssignment}
        onEditAssignment={handleEditAssignment}
        onDeleteAssignment={handleDeleteAssignment}
        onGradeAssignment={handleGradeAssignment}
      />

      {/* Create Assignment Dialog */}
      <CreateAssignmentDialog
        open={showCreateAssignment}
        onOpenChange={setShowCreateAssignment}
        groupId={groupId}
        totalStudents={totalStudents}
        onAssignmentCreated={onRefresh}
      />

      {/* View Assignment Dialog */}
      <ViewAssignmentDialog
        open={showViewAssignment}
        onOpenChange={handleCloseViewDialog}
        assignmentId={selectedAssignmentId}
        userRole="faculty"
        onEditAssignment={handleEditAssignment}
        onGradeAssignment={handleGradeAssignment}
      />

      {/* Edit Assignment Dialog */}
      <EditAssignmentDialog
        open={showEditAssignment}
        onOpenChange={handleCloseEditDialog}
        assignmentId={selectedAssignmentId}
        onAssignmentUpdated={handleAssignmentUpdated}
      />

      {/* Delete Assignment Dialog */}
      <DeleteAssignmentDialog
        open={showDeleteAssignment}
        onOpenChange={handleCloseDeleteDialog}
        assignmentId={selectedAssignmentId}
        assignmentTitle={selectedAssignmentTitle}
        onAssignmentDeleted={handleAssignmentUpdated}
      />
    </div>
  );
}
