"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GroupMember, DriveLink } from "@/types";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface GroupMembersListProps {
  members: GroupMember[];
  isLoading: boolean;
  onRemoveMember: (studentId: string) => void;
}

export default function GroupMembersList({ members, isLoading, onRemoveMember }: GroupMembersListProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const toggleMemberExpand = (memberId: string) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
    } else {
      setExpandedMember(memberId);
    }
  };

  if (members.length === 0) {
    return <p>No members in this group.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Group Members ({members.length})</h4>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>USN</TableHead>
            <TableHead>Group USN</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Links</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <React.Fragment key={member.id}>
              <TableRow className={expandedMember === member.id ? "bg-slate-50" : ""}>
                <TableCell className="font-medium">
                  {member.student?.name || member.name || 'Unnamed Student'}
                  {(member.student?.email || member.email) && (
                    <div className="text-xs text-muted-foreground">{member.student?.email || member.email}</div>
                  )}
                </TableCell>
                <TableCell>{member.student?.usn || member.usn || "N/A"}</TableCell>
                <TableCell>{member.student?.group_usn || member.group_usn || "Not assigned"}</TableCell>
                <TableCell>{member.student?.class || member.class || "Not assigned"}</TableCell>
                <TableCell>{member.student?.semester || member.semester || "Not assigned"}</TableCell>
                <TableCell>
                  {member.drive_links && member.drive_links.length > 0 ? (
                    <div className="flex items-center">
                      <span className="mr-2">{member.drive_links.length}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleMemberExpand(member.id)}
                        className="flex items-center gap-1"
                      >
                        {expandedMember === member.id ? "Hide" : "View"}
                        {expandedMember === member.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-500">No links</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {member.drive_links && member.drive_links.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleMemberExpand(member.id)}
                        className="flex items-center gap-1"
                      >
                        {expandedMember === member.id ? "Hide Links" : "Show Links"}
                        {expandedMember === member.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        // Use student_id from the member object
                        const studentId = member.student_id || "";
                        console.log('Removing student with ID:', studentId);
                        if (studentId) {
                          // Log the full member object for debugging
                          console.log('Full member object:', member);
                          onRemoveMember(studentId);
                        } else {
                          console.error('Cannot remove student: No student ID found');
                        }
                      }}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedMember === member.id && (
                <TableRow key={`${member.id}-links`}>
                  <TableCell colSpan={6} className="bg-slate-50 p-4">
                    {member.drive_links && member.drive_links.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Drive Links</h5>
                        <ul className="space-y-2">
                          {member.drive_links.map((link: DriveLink) => (
                            <li key={link.id} className="flex items-center gap-2">
                              <ExternalLink size={16} />
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {link.description || link.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No drive links added yet.</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
