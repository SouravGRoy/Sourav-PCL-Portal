import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserStore } from "@/lib/store";
import { createAssignment } from "@/lib/api/assignments";
import { getGroupsByFaculty } from "@/lib/api/groups";
import { Group } from "@/types";

interface CreateAssignmentFormProps {
  groupId?: string;
}

export default function CreateAssignmentForm({
  groupId,
}: CreateAssignmentFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        const groupsData = await getGroupsByFaculty(user.id);
        setGroups(groupsData);

        if (!groupId && groupsData.length > 0) {
          setSelectedGroupId(groupsData[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load groups");
      }
    };

    fetchGroups();
  }, [user, groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!selectedGroupId) {
        throw new Error("Please select a group");
      }

      await createAssignment({
        title,
        description,
        group_id: selectedGroupId,
        due_date: dueDate,
        type: "individual" as const,
        max_score: 100,
      });

      router.push(`/groups/${selectedGroupId}/assignments`);
    } catch (error: any) {
      setError(error.message || "Failed to create assignment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New Assignment</CardTitle>
        <CardDescription>
          Add a new assignment for your students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="w-full p-2 border rounded-md min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          {!groupId && (
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <select
                id="group"
                className="w-full p-2 border rounded-md"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                required
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Assignment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
