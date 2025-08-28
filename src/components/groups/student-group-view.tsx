"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { Group } from "@/types";
import { GroupsAPI } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import StudentDriveLinks from "./student-drive-links";

export default function StudentGroupView() {
  const { user } = useUserStore();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        if (!user) {
          setGroups([]);
          return;
        }

        const studentGroups = await GroupsAPI.getStudentGroups(user.id);
        setGroups(studentGroups || []);

        // Auto-select the first group if there's only one
        if (studentGroups && studentGroups.length === 1) {
          setSelectedGroup(studentGroups[0]);
        }
      } catch (error) {
        console.error("Error fetching student groups:", error);
        showToast({
          title: "Error",
          description: "Failed to fetch your groups",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [user, showToast]);

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Groups</h2>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p>Loading your groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p>You are not a member of any groups yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="space-y-4">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`cursor-pointer transition-colors ${
                    selectedGroup?.id === group.id ? "border-primary" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      Department: {group.department}
                      <br />
                      Group: {group.pcl_group_no}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedGroup ? (
              <StudentDriveLinks group={selectedGroup} />
            ) : (
              <div className="flex items-center justify-center h-32 border rounded-lg">
                <p>Select a group to manage your drive links</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
