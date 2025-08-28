import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { StudentAssignmentGroup } from "@/lib/api/student-assignment-groups";

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: StudentAssignmentGroup | null;
  assignmentTitle?: string;
}

export default function GroupMembersModal({
  isOpen,
  onClose,
  group,
  assignmentTitle,
}: GroupMembersModalProps) {
  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {group.group_name}
          </DialogTitle>
          {assignmentTitle && (
            <p className="text-sm text-muted-foreground">
              Assignment: {assignmentTitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Group {group.group_number}</Badge>
            <span className="text-sm text-muted-foreground">
              {group.members.length} member
              {group.members.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Members:</h4>
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{member.name}</p>
                  {member.usn && (
                    <p className="text-xs text-muted-foreground">
                      USN: {member.usn}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.email}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
