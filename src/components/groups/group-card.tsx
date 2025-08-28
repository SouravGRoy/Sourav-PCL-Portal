"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Group, GroupMember, Student } from "@/types";
import StudentSearch from "./student-search";
import GroupMembersList from "./group-members-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GroupCardProps {
  group: Group;
  isSelected: boolean;
  isLoading: boolean;
  groupMembers: GroupMember[];
  searchResults: Student[];
  onSelect: (group: Group) => void;
  onSearch: (searchTerm: string) => void;
  onAddStudent: (studentId: string) => void;
  onRemoveStudent: (studentId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export default function GroupCard({
  group,
  isSelected,
  isLoading,
  groupMembers,
  searchResults,
  onSelect,
  onSearch,
  onAddStudent,
  onRemoveStudent,
  onDeleteGroup,
}: GroupCardProps) {
  return (
    <Card>
      <CardHeader onClick={() => onSelect(group)} className="cursor-pointer">
        <CardTitle>{group.name}</CardTitle>
        <CardDescription>
          Department: {group.department}
          <br />
          Group: {group.pcl_group_no}
          {group.drive_link && (
            <>
              <br />
              <a
                href={group.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Drive Link
              </a>
            </>
          )}
        </CardDescription>
      </CardHeader>
      {isSelected && (
        <>
          <CardContent>
            <div className="space-y-4">
              <StudentSearch
                searchResults={searchResults}
                isLoading={isLoading}
                onSearch={onSearch}
                onAddStudent={onAddStudent}
              />
              <GroupMembersList
                members={groupMembers}
                isLoading={isLoading}
                onRemoveMember={onRemoveStudent}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            {onDeleteGroup && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the group and remove all students from it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteGroup(group.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
