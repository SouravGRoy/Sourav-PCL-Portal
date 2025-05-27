"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DriveLink, Group } from "@/types";
import { ExternalLink, Plus, Trash } from "lucide-react";
import { addStudentDriveLink, removeStudentDriveLink, getStudentDriveLinks } from "@/lib/api";
import { useUserStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";

interface StudentDriveLinksProps {
  group: Group;
}

export default function StudentDriveLinks({ group }: StudentDriveLinksProps) {
  const { user } = useUserStore();
  const { showToast } = useToast();
  const [driveLinks, setDriveLinks] = useState<DriveLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkDescription, setNewLinkDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const MAX_LINKS = 5;

  useEffect(() => {
    const fetchDriveLinks = async () => {
      if (!user || !group) return;
      
      try {
        setIsLoading(true);
        const links = await getStudentDriveLinks(group.id, user.id);
        setDriveLinks(links);
      } catch (error) {
        console.error("Error fetching drive links:", error);
        showToast({
          title: "Error",
          description: "Failed to fetch drive links",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriveLinks();
  }, [user, group, showToast]);

  const handleAddLink = async () => {
    if (!user || !group) return;
    if (!newLinkUrl.trim()) {
      showToast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (driveLinks.length >= MAX_LINKS) {
      showToast({
        title: "Error",
        description: `You can only add up to ${MAX_LINKS} drive links per group`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const link = await addStudentDriveLink(
        group.id,
        user.id,
        newLinkUrl,
        newLinkDescription || "Google Drive Link"
      );
      
      setDriveLinks([...driveLinks, link]);
      setNewLinkUrl("");
      setNewLinkDescription("");
      showToast({
        title: "Success",
        description: "Drive link added successfully",
      });
    } catch (error) {
      console.error("Error adding drive link:", error);
      showToast({
        title: "Error",
        description: "Failed to add drive link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      setIsLoading(true);
      const success = await removeStudentDriveLink(linkId);
      
      if (success) {
        setDriveLinks(driveLinks.filter(link => link.id !== linkId));
        showToast({
          title: "Success",
          description: "Drive link removed successfully",
        });
      }
    } catch (error) {
      console.error("Error removing drive link:", error);
      showToast({
        title: "Error",
        description: "Failed to remove drive link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Drive Links for {group.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Drive Links ({driveLinks.length}/{MAX_LINKS})</h3>
          {driveLinks.length === 0 ? (
            <p className="text-sm text-gray-500">No drive links added yet.</p>
          ) : (
            <ul className="space-y-2">
              {driveLinks.map(link => (
                <li key={link.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ExternalLink size={16} className="shrink-0" />
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {link.description || link.url}
                    </a>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveLink(link.id)}
                    disabled={isLoading}
                  >
                    <Trash size={16} className="text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {driveLinks.length < MAX_LINKS && (
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Add New Drive Link</h3>
            <div className="space-y-2">
              <Input
                placeholder="Google Drive URL"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                disabled={isLoading}
              />
              <Input
                placeholder="Description (optional)"
                value={newLinkDescription}
                onChange={(e) => setNewLinkDescription(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                onClick={handleAddLink} 
                disabled={isLoading || !newLinkUrl.trim()}
                className="w-full flex items-center gap-1"
              >
                <Plus size={16} /> Add Drive Link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
