import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  FileText,
  Settings,
  Shuffle,
  UserPlus,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAssignmentDetails, updateAssignment } from "@/lib/api/assignments";

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  onAssignmentUpdated?: () => void;
}

interface AssignmentForm {
  title: string;
  description: string;
  type: "individual" | "group";
  dueDate: string;
  maxScore: number;
  groupSize: number;
  groupType: "random" | "manual";
  instructions: string;
  status: "draft" | "active" | "completed" | "archived";
  rubricCriteria: Array<{
    id?: string;
    name: string;
    points: number;
    description: string;
  }>;
}

export default function EditAssignmentDialog({
  open,
  onOpenChange,
  assignmentId,
  onAssignmentUpdated,
}: EditAssignmentDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingGroups, setIsCreatingGroups] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const { showToast } = useToast();

  const [form, setForm] = useState<AssignmentForm>({
    title: "",
    description: "",
    type: "individual",
    dueDate: "",
    maxScore: 100,
    groupSize: 3,
    groupType: "random",
    instructions: "",
    status: "draft",
    rubricCriteria: [],
  });

  // Load assignment data when dialog opens and cleanup when it closes
  useEffect(() => {
    if (open && assignmentId) {
      loadAssignmentData(assignmentId);
    } else if (!open) {
      // Reset all state when dialog closes
      setActiveTab("basic");
      setIsSubmitting(false);
      setIsLoading(false);
      setIsCreatingGroups(false);
      setGroups([]);
      setAvailableStudents([]);
      setForm({
        title: "",
        description: "",
        type: "individual",
        dueDate: "",
        maxScore: 100,
        groupSize: 3,
        groupType: "random",
        instructions: "",
        status: "draft",
        rubricCriteria: [],
      });
    }
  }, [open, assignmentId]);

  // Cleanup effect to prevent dialog state conflicts
  useEffect(() => {
    return () => {
      // Cleanup any open Select dropdowns when component unmounts
      const selectElements = document.querySelectorAll(
        "[data-radix-select-content]"
      );
      selectElements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, []);

  // Additional cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      // Force cleanup of any remaining portal elements
      setTimeout(() => {
        const portalElements = document.querySelectorAll("[data-radix-portal]");
        portalElements.forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      }, 100);
    }
  }, [open]);

  const loadAssignmentData = async (id: string) => {
    try {
      setIsLoading(true);

      const assignment = await getAssignmentDetails(id);
      console.log("Assignment loaded:", assignment);
      console.log("Groups data:", assignment.groups);

      setForm({
        title: assignment.title,
        description: assignment.description || "",
        type: assignment.type,
        dueDate: new Date(assignment.due_date).toISOString().slice(0, 16),
        maxScore: assignment.max_score,
        groupSize: assignment.group_size || 3,
        groupType:
          (assignment.group_formation_type as "random" | "manual" | null) ||
          "random",
        instructions: assignment.instructions || "",
        status: assignment.status,
        rubricCriteria:
          assignment.assignment_rubrics?.map((rubric: any) => ({
            id: rubric.id,
            name: rubric.criteria_name,
            points: rubric.max_points,
            description: rubric.criteria_description || "",
          })) || [],
      });

      // Load student count from the class this assignment belongs to
      // Handle both array and single object structure for groups
      const groupsData = Array.isArray(assignment.groups)
        ? assignment.groups[0]
        : assignment.groups;
      if (groupsData && groupsData.group_members) {
        const studentCount = groupsData.group_members.length;
        console.log("Setting student count:", studentCount);
        console.log("Group members data:", groupsData.group_members);
        setTotalStudents(studentCount);

        // Also set available students initially (all students from the class)
        setAvailableStudents(groupsData.group_members);
      } else {
        console.log("No groups or group_members found in assignment data");
        console.log("Assignment groups structure:", assignment.groups);
      }
    } catch (error) {
      console.error("Error loading assignment:", error);
      showToast({
        title: "Error",
        description: "Failed to load assignment data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing groups when assignment is loaded
  useEffect(() => {
    if (assignmentId && form.type === "group") {
      loadGroups();
    }
  }, [assignmentId, form.type]);

  const loadGroups = async () => {
    if (!assignmentId) return;

    try {
      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get",
          assignmentId,
        }),
      });

      const data = await response.json();
      if (data.groups) {
        setGroups(data.groups);

        // Update available students to exclude those already in groups
        if (data.availableStudents) {
          setAvailableStudents(data.availableStudents);
        }

        // Debug logging
        console.log("Available students structure:", data.availableStudents);
        console.log("Groups structure:", data.groups);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const handleCreateGroups = async () => {
    if (!assignmentId) {
      console.log("No assignment ID available");
      return;
    }

    console.log("Creating groups with:", {
      assignmentId,
      groupSize: form.groupSize,
      formationType: form.groupType,
      totalStudents,
    });

    try {
      setIsCreatingGroups(true);

      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          assignmentId,
          groupSize: form.groupSize,
          formationType: form.groupType,
        }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        showToast({
          title: "Success",
          description: `Groups created successfully! ${result.groups.length} groups formed.`,
        });
        await loadGroups(); // Reload groups to show the new ones
      } else {
        showToast({
          title: "Error",
          description: result.error || "Failed to create groups",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating groups:", error);
      showToast({
        title: "Error",
        description: "Failed to create groups",
        variant: "destructive",
      });
    } finally {
      setIsCreatingGroups(false);
    }
  };

  const handleDeleteGroups = async () => {
    if (!assignmentId) return;

    try {
      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          assignmentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast({
          title: "Success",
          description: "Groups deleted successfully",
        });
        setGroups([]);
        setAvailableStudents([]);
        await loadGroups(); // Reload to refresh available students
      } else {
        showToast({
          title: "Error",
          description: result.error || "Failed to delete groups",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting groups:", error);
      showToast({
        title: "Error",
        description: "Failed to delete groups",
        variant: "destructive",
      });
    }
  };

  const handleAddStudentToGroup = async (
    groupId: string,
    studentId: string
  ) => {
    console.log("Adding student to group:", { groupId, studentId });

    try {
      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-student",
          assignmentGroupId: groupId,
          studentId,
        }),
      });

      const result = await response.json();
      console.log("Add student result:", result);

      if (result.success) {
        showToast({
          title: "Success",
          description: "Student added to group",
        });
        await loadGroups(); // Reload groups
      } else {
        showToast({
          title: "Error",
          description: result.error || "Failed to add student",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding student:", error);
      showToast({
        title: "Error",
        description: "Failed to add student to group",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudentFromGroup = async (
    groupId: string,
    studentId: string
  ) => {
    try {
      const response = await fetch("/api/assignment-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-student",
          assignmentGroupId: groupId,
          studentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast({
          title: "Success",
          description: "Student removed from group",
        });
        await loadGroups(); // Reload groups
      } else {
        showToast({
          title: "Error",
          description: result.error || "Failed to remove student",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing student:", error);
      showToast({
        title: "Error",
        description: "Failed to remove student from group",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!form.title.trim()) {
        showToast({
          title: "Error",
          description: "Assignment title is required",
          variant: "destructive",
        });
        return;
      }

      if (!form.dueDate) {
        showToast({
          title: "Error",
          description: "Due date is required",
          variant: "destructive",
        });
        return;
      }

      if (form.type === "group" && (!form.groupSize || form.groupSize < 2)) {
        showToast({
          title: "Error",
          description: "Group size must be at least 2 for group assignments",
          variant: "destructive",
        });
        return;
      }

      // Prepare assignment data for API
      const assignmentData = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        instructions: form.instructions.trim() || undefined,
        type: form.type,
        max_score: form.maxScore,
        due_date: new Date(form.dueDate).toISOString(),
        group_size: form.type === "group" ? form.groupSize : undefined,
        group_formation_type:
          form.type === "group" ? form.groupType : undefined,
        status: form.status,
        rubric_criteria: form.rubricCriteria.map((criteria) => ({
          id: criteria.id,
          criteria_name: criteria.name,
          criteria_description: criteria.description,
          max_points: criteria.points,
        })),
      };

      console.log("Updating assignment with data:", assignmentData);

      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      const result = await updateAssignment(assignmentId, assignmentData);

      showToast({
        title: "Success",
        description: "Assignment updated successfully!",
      });

      // Call the callback to refresh the assignments list
      if (onAssignmentUpdated) {
        onAssignmentUpdated();
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating assignment:", error);
      showToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRubricCriteria = () => {
    setForm({
      ...form,
      rubricCriteria: [
        ...form.rubricCriteria,
        { name: "", points: 0, description: "" },
      ],
    });
  };

  const updateRubricCriteria = (index: number, field: string, value: any) => {
    const updated = [...form.rubricCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, rubricCriteria: updated });
  };

  const removeRubricCriteria = (index: number) => {
    setForm({
      ...form,
      rubricCriteria: form.rubricCriteria.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Assignment</DialogTitle>
            <DialogDescription>
              Please wait while we load the assignment details...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update assignment details, rubrics, and settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="instructions"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Instructions
            </TabsTrigger>
            <TabsTrigger value="rubric" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rubric
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Binary Tree Implementation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Assignment Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: "individual" | "group") =>
                    setForm({ ...form, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">Maximum Score</Label>
                <Input
                  id="maxScore"
                  type="number"
                  value={form.maxScore}
                  onChange={(e) =>
                    setForm({ ...form, maxScore: parseInt(e.target.value) })
                  }
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(
                    value: "draft" | "active" | "completed" | "archived"
                  ) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description of the assignment..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">Detailed Instructions</Label>
              <Textarea
                id="instructions"
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                placeholder="Provide detailed instructions for students..."
                rows={10}
                className="min-h-[200px]"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                💡 Tip: Include clear requirements, submission format, and any
                resources students might need.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="rubric" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Grading Rubric</h3>
              <Button onClick={addRubricCriteria} variant="outline" size="sm">
                Add Criteria
              </Button>
            </div>

            <div className="space-y-3">
              {form.rubricCriteria.map((criteria, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Criteria Name</Label>
                        <Input
                          value={criteria.name}
                          onChange={(e) =>
                            updateRubricCriteria(index, "name", e.target.value)
                          }
                          placeholder="e.g., Code Quality"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={criteria.points}
                          onChange={(e) =>
                            updateRubricCriteria(
                              index,
                              "points",
                              parseInt(e.target.value)
                            )
                          }
                          placeholder="Points"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={criteria.description}
                          onChange={(e) =>
                            updateRubricCriteria(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Description"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRubricCriteria(index)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Points:</span>
                  <Badge variant="outline">
                    {form.rubricCriteria.reduce(
                      (sum, criteria) => sum + criteria.points,
                      0
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {form.type === "group" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Group Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Group Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groupSize">Group Size</Label>
                      <Input
                        id="groupSize"
                        type="number"
                        value={form.groupSize}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            groupSize: parseInt(e.target.value),
                          })
                        }
                        min="2"
                        max="10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="groupType">Group Formation</Label>
                      <Select
                        value={form.groupType}
                        onValueChange={(value: "random" | "manual") =>
                          setForm({ ...form, groupType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">
                            Random Assignment
                          </SelectItem>
                          <SelectItem value="manual">
                            Manual Selection
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class Size</Label>
                      <div className="text-sm text-muted-foreground">
                        {totalStudents} students enrolled
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Will create {Math.ceil(totalStudents / form.groupSize)}{" "}
                        groups (A, B, C...)
                      </div>
                    </div>
                  </div>

                  {/* Group Formation Preview */}
                  {form.groupType && totalStudents > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <h5 className="font-medium">Preview:</h5>
                      <div className="text-sm text-muted-foreground">
                        {form.groupType === "random" ? (
                          <p>
                            ✨ Random Assignment: Students will be automatically
                            shuffled into{" "}
                            {Math.ceil(totalStudents / form.groupSize)} groups
                          </p>
                        ) : (
                          <p>
                            👥 Manual Selection:{" "}
                            {Math.ceil(totalStudents / form.groupSize)} empty
                            groups will be created for you to assign students
                            manually
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs">
                        {Array.from(
                          { length: Math.ceil(totalStudents / form.groupSize) },
                          (_, i) => (
                            <Badge key={i} variant="outline">
                              Group {String.fromCharCode(65 + i)}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Group Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateGroups}
                      disabled={isCreatingGroups || groups.length > 0}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      {form.groupType === "random" ? (
                        <Shuffle className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {isCreatingGroups
                        ? "Creating Groups..."
                        : form.groupType === "random"
                        ? "🎲 Create Random Groups"
                        : "📝 Create Empty Groups"}
                    </Button>

                    {groups.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteGroups}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete All Groups
                      </Button>
                    )}
                  </div>

                  {/* No Groups Created Yet Message */}
                  {groups.length === 0 && form.groupType && (
                    <div className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg text-center">
                      <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No groups created yet. Click the button above to create{" "}
                        {form.groupType === "random" ? "random" : "empty"}{" "}
                        groups.
                      </p>
                    </div>
                  )}

                  {/* Groups Display - Note: Potential portal issue source */}
                  {groups.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          Current Groups ({groups.length})
                        </h4>
                        <Badge variant="outline">
                          {groups.reduce(
                            (acc, group) => acc + group.members.length,
                            0
                          )}{" "}
                          students assigned
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => (
                          <Card key={group.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">
                                  {group.group_name}
                                </h5>
                                <Badge variant="secondary">
                                  {group.members.length} members
                                </Badge>
                              </div>

                              {/* Group Members */}
                              <div className="space-y-2">
                                {group.members.map((member: any) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span>{member.student?.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleRemoveStudentFromGroup(
                                          group.id,
                                          member.student_id
                                        )
                                      }
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              {/* Add Student Dropdown for Manual Groups - This is likely causing the portal issue */}
                              {form.groupType === "manual" &&
                                availableStudents.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      Add Student:
                                    </Label>
                                    <Select
                                      onValueChange={(studentId) =>
                                        handleAddStudentToGroup(
                                          group.id,
                                          studentId
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Add student..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableStudents.map(
                                          (student: any) => (
                                            <SelectItem
                                              key={student.student_id}
                                              value={student.student_id}
                                            >
                                              {student.profiles
                                                ?.student_profiles?.[0]?.name ||
                                                "Unknown Student"}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                              {/* Debug info for manual groups */}
                              {form.groupType === "manual" && (
                                <div className="text-xs text-muted-foreground">
                                  Available: {availableStudents.length} students
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Available Students */}
                      {availableStudents.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">
                            Unassigned Students ({availableStudents.length})
                          </h5>
                          <div className="text-xs text-muted-foreground">
                            {availableStudents.map((student: any, index) => (
                              <span key={student.student_id}>
                                {student.profiles?.student_profiles?.[0]
                                  ?.name || "Unknown"}
                                {index < availableStudents.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Additional Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Late Submissions</Label>
                    <p className="text-sm text-muted-foreground">
                      Students can submit after the due date
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Peer Review</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable peer evaluation component
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== "settings" && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["basic", "instructions", "rubric", "settings"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Assignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
