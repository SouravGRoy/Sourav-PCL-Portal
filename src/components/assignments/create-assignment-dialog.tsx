import { useState } from "react";
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
import { Calendar, Users, FileText, Settings } from "lucide-react";
import { createAssignment } from "@/lib/api/assignments";
import { useToast } from "@/components/ui/use-toast";

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  totalStudents: number;
  onAssignmentCreated?: () => void; // Add callback for refresh
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
  rubricCriteria: Array<{
    name: string;
    points: number;
    description: string;
  }>;
}

export default function CreateAssignmentDialog({
  open,
  onOpenChange,
  groupId,
  totalStudents,
  onAssignmentCreated,
}: CreateAssignmentDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    rubricCriteria: [
      {
        name: "Quality",
        points: 40,
        description: "Code quality and structure",
      },
      {
        name: "Functionality",
        points: 40,
        description: "Correct implementation",
      },
      { name: "Documentation", points: 20, description: "Clear documentation" },
    ],
  });

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
      } // Prepare assignment data for API
      const assignmentData = {
        group_id: groupId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        instructions: form.instructions.trim() || undefined,
        type: form.type,
        max_score: form.maxScore,
        due_date: new Date(form.dueDate).toISOString(),
        group_size: form.type === "group" ? form.groupSize : undefined,
        group_formation_type:
          form.type === "group" ? form.groupType : undefined,
        allow_late_submission: false,
        late_submission_penalty: 0,
        enable_peer_review: false,
        rubric_criteria: form.rubricCriteria.map((criteria) => ({
          criteria_name: criteria.name,
          criteria_description: criteria.description,
          max_points: criteria.points,
        })),
      };

      console.log("Creating assignment with data:", assignmentData);

      const result = await createAssignment(assignmentData);
      console.log("Assignment created successfully:", result);

      showToast({
        title: "Success",
        description: "Assignment created successfully!",
      }); // Call the callback to refresh the assignments list
      if (onAssignmentCreated) {
        onAssignmentCreated();
      }

      onOpenChange(false);

      // Reset form
      setForm({
        title: "",
        description: "",
        type: "individual",
        dueDate: "",
        maxScore: 100,
        groupSize: 3,
        groupType: "random",
        instructions: "",
        rubricCriteria: [
          {
            name: "Quality",
            points: 40,
            description: "Code quality and structure",
          },
          {
            name: "Functionality",
            points: 40,
            description: "Correct implementation",
          },
          {
            name: "Documentation",
            points: 20,
            description: "Clear documentation",
          },
        ],
      });
      setActiveTab("basic");
    } catch (error) {
      console.error("Error creating assignment:", error);
      showToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create assignment",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Set up a comprehensive assignment with grading rubrics and group
            settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="w-full flex overflow-x-auto sm:grid sm:grid-cols-4 gap-2 sm:gap-0 rounded-lg bg-muted/50 p-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <TabsTrigger
              value="basic"
              className="flex items-center gap-2 min-w-[110px] sm:min-w-0 justify-center"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
              <span className="inline sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="instructions"
              className="flex items-center gap-2 min-w-[110px] sm:min-w-0 justify-center"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Instructions</span>
              <span className="inline sm:hidden">Guide</span>
            </TabsTrigger>
            <TabsTrigger
              value="rubric"
              className="flex items-center gap-2 min-w-[110px] sm:min-w-0 justify-center"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Rubric</span>
              <span className="inline sm:hidden">Rubric</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 min-w-[110px] sm:min-w-0 justify-center"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="inline sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <h3 className="text-lg font-semibold">Grading Rubric</h3>
              <Button onClick={addRubricCriteria} variant="outline" size="sm">
                Add Criteria
              </Button>
            </div>

            <div className="space-y-3">
              {form.rubricCriteria.map((criteria, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  </div>

                  {/* Group Formation Info */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-2">
                        Group Formation Preview:
                      </p>
                      <p>
                        With {totalStudents} students and group size of{" "}
                        {form.groupSize}, you'll create{" "}
                        {Math.ceil(totalStudents / form.groupSize)} groups (A,
                        B, C, etc.).
                      </p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">
                        {form.groupType === "random"
                          ? "Random Assignment"
                          : "Manual Selection"}
                        :
                      </p>
                      <p>
                        {form.groupType === "random"
                          ? "Students will be automatically and randomly assigned to groups when you create groups after saving this assignment."
                          : "Empty groups will be created and you can manually assign students to each group after saving this assignment."}
                      </p>
                    </div>

                    <div className="text-xs text-muted-foreground border-t pt-2">
                      💡 Groups will be created in the assignment settings after
                      you save this assignment.
                    </div>
                  </div>
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
              {isSubmitting ? "Creating..." : "Create Assignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
