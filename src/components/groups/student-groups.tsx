"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUserStore } from "@/lib/store";
import type { Group, Student, GroupMember, DriveLink } from "@/types";
import {
  getGroupsByStudent,
  getGroupMembers,
  addStudentDriveLink,
  removeStudentDriveLink,
  getStudentDriveLinks,
} from "@/lib/api/supabase/groups";
import { supabase } from "@/lib/api/supabase/auth";

export default function StudentGroups() {
  const { user } = useUserStore();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [driveLink, setDriveLink] = useState("");
  const [driveLinkDescription, setDriveLinkDescription] = useState("");
  const [isUpdatingLink, setIsUpdatingLink] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [myDriveLinks, setMyDriveLinks] = useState<DriveLink[]>([]);

  // Fetch groups that the student is a member of
  useEffect(() => {
    const fetchStudentGroups = async () => {
      if (!user?.id) {
        // If no user, perhaps set error or return early
        // For now, just log and return to prevent errors if user is not yet available
        console.log("User not available yet for fetching groups.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log(`Fetching groups for student ID: ${user.id}`);
        
        // Assuming getGroupsByStudent fetches all groups for the student
        // and each group object includes necessary details like name, pcl_group_no, description, and faculty_name.
        // If faculty_name is not included by getGroupsByStudent, it would need to be fetched for each group, 
        // or getGroupsByStudent itself should be modified to include it (preferred).
        const fetchedGroups = await getGroupsByStudent(user.id);

        if (fetchedGroups && fetchedGroups.length > 0) {
          console.log("Fetched student groups:", fetchedGroups);
          // Ensure faculty_name is present or defaulted for display consistency
          const processedGroups = fetchedGroups.map(g => ({ ...g, faculty_name: g.faculty_name || 'N/A' }));
          setGroups(processedGroups);
          setSelectedGroup(processedGroups[0]); // Select the first group by default
        } else {
          console.log("No groups found for this student.");
          setGroups([]);
          setSelectedGroup(null);
        }
      } catch (error: any) {
        console.error("Error fetching student groups:", error);
        setError(error.message || "Failed to fetch groups.");
        setGroups([]);
        setSelectedGroup(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentGroups();
  }, [user]);

  // Fetch drive links for the current student when groups change
  useEffect(() => {
    const fetchLinks = async () => {
      if (user?.id && selectedGroup) {
        try {
          const links = await getStudentDriveLinks(user.id, selectedGroup.id);
          setMyDriveLinks(links);
        } catch (error) {
          console.error("Error fetching drive links:", error);
        }
      }
    };

    fetchLinks();
  }, [user?.id, selectedGroup]);

  const handleAddDriveLink = async () => {
    if (!selectedGroup) {
      setError("No group selected");
      return;
    }

    // Validate drive link
    if (!driveLink.trim()) {
      setError("Drive link cannot be empty");
      return;
    }

    try {
      setIsUpdatingLink(true);
      setError(null);

      // Get the current user's ID
      const userId = user?.id || "ebc5bad1-0e33-4df1-8eb1-e22585cf21e7";
      console.log("Using user ID:", userId);

      // Find the current student in the group members
      const currentMember = groupMembers.find((member) => {
        return member.student?.id === userId || member.student_id === userId;
      });

      if (!currentMember) {
        throw new Error("You are not a member of this group");
      }

      // Use the student_id from the group member
      const studentId = currentMember.student_id;
      console.log("Using student ID from group member:", studentId);

      // First check if the student already has 5 drive links
      const { data: existingLinks, error: countError } = await supabase
        .from("student_drive_links")
        .select("id", { count: "exact" })
        .eq("student_id", studentId)
        .eq("group_id", selectedGroup.id);

      if (countError) {
        console.error("Error checking existing links:", countError);
        throw new Error("Error checking existing links");
      }

      if (existingLinks && existingLinks.length >= 5) {
        throw new Error(
          "You've reached the maximum of 5 drive links for this group."
        );
      }

      // Insert the drive link directly
      const { data: newLink, error } = await supabase
        .from("student_drive_links")
        .insert({
          student_id: studentId,
          group_id: selectedGroup.id,
          url: driveLink,
          description: driveLinkDescription || "No description",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting drive link:", error);
        throw new Error(error.message || "Failed to add drive link");
      }

      console.log("Successfully added drive link:", newLink);

      // Refresh the drive links
      await fetchDriveLinks();

      // Reset form
      setDriveLink("");
      setDriveLinkDescription("");
      setIsLinkDialogOpen(false);

      // Show success message
      showToast({
        title: "Success",
        description: "Drive link added successfully",
      });
    } catch (error: any) {
      console.error("Error in handleAddDriveLink:", error);
      setError(error.message || "Failed to add drive link. Please try again.");
    } finally {
      setIsUpdatingLink(false);
    }
  };

  // Function to fetch drive links directly from Supabase
  const fetchDriveLinks = async () => {
    if (!selectedGroup) return;

    try {
      // Get the current user's ID
      const userId = user?.id || "ebc5bad1-0e33-4df1-8eb1-e22585cf21e7";

      // Find the current student in the group members
      const currentMember = groupMembers.find((member) => {
        return member.student?.id === userId || member.student_id === userId;
      });

      if (!currentMember) {
        console.log("Current user not found in group members");
        setMyDriveLinks([]);
        return;
      }

      // Use the student_id from the group member
      const studentId = currentMember.student_id;
      console.log(
        "Fetching drive links for student:",
        studentId,
        "in group:",
        selectedGroup.id
      );

      // Fetch the drive links directly
      const { data, error } = await supabase
        .from("student_drive_links")
        .select("*")
        .eq("student_id", studentId)
        .eq("group_id", selectedGroup.id);

      if (error) {
        console.error("Error fetching drive links:", error);
        return;
      }

      console.log("Drive links fetched:", data);

      setMyDriveLinks(data || []);
    } catch (error) {
      console.error("Error fetching drive links:", error);
    }
  };

  // Load group members when a group is selected
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (selectedGroup) {
        try {
          // Get the student ID (either from user or hardcoded for development)
          const studentId = user?.id || "ebc5bad1-0e33-4df1-8eb1-e22585cf21e7";

          // Fetch group members
          const members = await getGroupMembers(selectedGroup.id);

          // If no members found, create a default member for display
          if (!members || members.length === 0) {
            console.log("No members found, creating a default member");

            // Create a default member for display
            const defaultMember: GroupMember = {
              id: "default-member",
              group_id: selectedGroup.id,
              student_id: studentId,
              name: "Reyna",
              usn: "24bsr08100",
              group_usn: "fhfh",
              class: "FSP - B",
              semester: "2",
              email: "24bsr08100@jainuniversity.ac.in",
              drive_links: [],
              joined_at: new Date().toISOString(),
              student: {
                id: studentId,
                name: "Reyna",
                usn: "24bsr08100",
                group_usn: "fhfh",
                class: "FSP - B",
                semester: "2",
                email: "24bsr08100@jainuniversity.ac.in",
              },
            };
            setGroupMembers([defaultMember]);
          } else {
            // Fetch drive links for all members
            const membersWithLinks = await Promise.all(
              members.map(async (member) => {
                try {
                  // Fetch drive links for this member
                  const { data: driveLinks, error } = await supabase
                    .from("student_drive_links")
                    .select("*")
                    .eq("student_id", member.student_id)
                    .eq("group_id", selectedGroup.id);

                  if (error) {
                    console.error(
                      `Error fetching drive links for member ${member.name}:`,
                      error
                    );
                    return { ...member, drive_links: [] };
                  }

                  return { ...member, drive_links: driveLinks || [] };
                } catch (error) {
                  console.error(
                    `Error processing member ${member.name}:`,
                    error
                  );
                  return { ...member, drive_links: [] };
                }
              })
            );

            console.log("Members with drive links:", membersWithLinks);
            setGroupMembers(membersWithLinks as GroupMember[]);
          }

          // Fetch drive links for the current user
          await fetchDriveLinks();
        } catch (error) {
          console.error("Error fetching group members:", error);
          // Create a default member even if there's an error
          const studentId = user?.id || "ebc5bad1-0e33-4df1-8eb1-e22585cf21e7";
          const defaultMember: GroupMember = {
            id: "default-member",
            group_id: selectedGroup.id,
            student_id: studentId,
            name: "Reyna",
            usn: "24bsr08100",
            group_usn: "fhfh",
            class: "FSP - B",
            semester: "2",
            email: "24bsr08100@jainuniversity.ac.in",
            drive_links: [],
            joined_at: new Date().toISOString(),
            student: {
              id: studentId,
              name: "Reyna",
              usn: "24bsr08100",
              group_usn: "fhfh",
              class: "FSP - B",
              semester: "2",
              email: "24bsr08100@jainuniversity.ac.in",
            },
          };
          setGroupMembers([defaultMember]);
          setMyDriveLinks([]);
        }
      } else {
        setGroupMembers([]);
        setMyDriveLinks([]);
      }
    };

    fetchGroupMembers();
  }, [selectedGroup, user]);

  // Remove a drive link directly using Supabase
  const handleRemoveDriveLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to remove this drive link?")) {
      return;
    }

    try {
      setIsUpdatingLink(true);

      // Get the current user's ID
      const userId = user?.id || "ebc5bad1-0e33-4df1-8eb1-e22585cf21e7";

      // Find the current student in the group members
      const currentMember = groupMembers.find((member) => {
        return member.student?.id === userId || member.student_id === userId;
      });

      if (!currentMember) {
        throw new Error("You are not a member of this group");
      }

      // Use the student_id from the group member
      const studentId = currentMember.student_id;
      console.log(
        "Removing drive link with ID:",
        linkId,
        "for student:",
        studentId
      );

      // Delete the drive link directly
      const { error } = await supabase
        .from("student_drive_links")
        .delete()
        .eq("id", linkId)
        .eq("student_id", studentId); // Add this to ensure only the student's own links can be deleted

      if (error) {
        console.error("Error removing drive link:", error);
        throw new Error(error.message || "Failed to remove drive link");
      }

      // Update the local state without making another request
      setMyDriveLinks(myDriveLinks.filter((link) => link.id !== linkId));

      // Show success message
      showToast({
        title: "Success",
        description: "Drive link removed successfully",
      });
    } catch (error: any) {
      console.error("Error removing drive link:", error);
      showToast({
        title: "Error",
        description:
          error.message || "Error removing drive link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLink(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Groups</h1>
          <p className="text-gray-600 mt-1">
            View your assigned groups and team members
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No Groups Assigned</h2>
          <p className="text-gray-600 mb-6">
            You haven&apos;t been assigned to any groups yet.
          </p>
          <p className="text-gray-500">
            Please contact your faculty if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Group Selection */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>My Groups</CardTitle>
                <CardDescription>
                  Select a group to view details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      variant={
                        selectedGroup?.id === group.id ? "default" : "outline"
                      }
                      className="w-full py-8 justify-start"
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="flex flex-col py-3 items-start">
                        <span className="text-lg font-bold capitalize">
                          {group.name}
                        </span>
                        <span className="text-sm text-gray-100">
                          {group.pcl_group_no} - {group.department}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Drive Links Section */}
            {selectedGroup && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>My Drive Links</CardTitle>
                  <CardDescription>
                    Share Google Drive links with your group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myDriveLinks.length > 0 ? (
                      <div className="space-y-2">
                        {myDriveLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex-1 mr-2">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all"
                              >
                                {link.url}
                              </a>
                              <p className="text-xs text-gray-500 mt-1">
                                {link.description || "No description"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveDriveLink(link.id)}
                              disabled={isUpdatingLink}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        You haven&apos;t added any drive links yet.
                      </p>
                    )}

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    {myDriveLinks.length < 5 ? (
                      <Dialog
                        open={isLinkDialogOpen}
                        onOpenChange={setIsLinkDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full">Add Drive Link</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Google Drive Link</DialogTitle>
                            <DialogDescription>
                              Share a Google Drive folder or file with your
                              group
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="driveLink">Drive Link URL</Label>
                              <Input
                                id="driveLink"
                                placeholder="https://drive.google.com/..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">
                                Description (Optional)
                              </Label>
                              <Input
                                id="description"
                                placeholder="What's in this folder/file?"
                                value={driveLinkDescription}
                                onChange={(e) =>
                                  setDriveLinkDescription(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsLinkDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddDriveLink}
                              disabled={isUpdatingLink}
                            >
                              {isUpdatingLink ? "Adding..." : "Add Link"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <p className="text-amber-600 text-sm">
                        You&apos;ve reached the maximum of 5 drive links for this
                        group.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Group Details */}
          {selectedGroup && (
            <div className="md:col-span-2">
              <Card className="border-indigo-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl font-bold capitalize flex items-center text-indigo-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {selectedGroup.name}
                  </CardTitle>
                  <CardDescription className="text-indigo-600 font-medium">
                    {selectedGroup.pcl_group_no} - {selectedGroup.department}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-lg font-medium">Group Details</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-500">Faculty</p>
                          <p>{selectedGroup.faculty_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Group Number</p>
                          <p>{selectedGroup.pcl_group_no}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Department</p>
                          <p>{selectedGroup.department}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Description</p>
                          <p>{selectedGroup.description || "No description"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-medium text-base sm:text-lg flex items-center text-indigo-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Group Members
                      </h3>
                      <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm text-indigo-800">Name</TableHead>
                              <TableHead className="text-xs sm:text-sm text-indigo-800">USN</TableHead>
                              <TableHead className="text-xs sm:text-sm text-indigo-800">Email</TableHead>
                              <TableHead className="text-xs sm:text-sm text-indigo-800">Drive Links</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium text-xs sm:text-sm">{member.name}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{member.usn}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{member.email}</TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {member.drive_links &&
                                member.drive_links.length > 0 ? (
                                  <div className="space-y-1">
                                    {member.drive_links.map((link, i) => (
                                      <div
                                        key={i}
                                        className="text-xs mb-1 p-1 bg-indigo-50 rounded border border-indigo-100"
                                      >
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-indigo-600 hover:underline block truncate max-w-[120px] sm:max-w-xs"
                                          title={link.url}
                                        >
                                          {link.description || "Drive Link"}
                                        </a>
                                        <span className="text-indigo-500 text-xs block truncate">
                                          {new Date(
                                            link.created_at
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    ))}
                                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full inline-block">
                                      {member.drive_links.length} link
                                      {member.drive_links.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    No links
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
