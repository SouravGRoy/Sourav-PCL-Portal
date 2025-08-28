import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  submission_text?: string;
  submission_url?: string;
  file_attachments?: any[];
  submitted_at: string;
  is_late: boolean;
  total_score?: number;
  feedback?: string;
  status: "draft" | "submitted" | "graded" | "returned";
  student?: {
    id: string;
    name: string;
    email: string;
  };
}

interface SubmissionsTableProps {
  submissions: Submission[];
  onGradeClick: (submission: Submission) => void;
}

export default function SubmissionsTable({
  submissions,
  onGradeClick,
}: SubmissionsTableProps) {
  const getStatusIcon = (status: string, isLate: boolean) => {
    if (isLate) return <AlertCircle className="h-4 w-4 text-red-500" />;

    switch (status) {
      case "submitted":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "graded":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Student Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Student</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id} className="hover:bg-gray-50">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {submission.student?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {submission.student?.name || "Unknown Student"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submission.student?.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    {new Date(submission.submitted_at).toLocaleDateString()}
                    {submission.is_late && (
                      <Badge variant="destructive" className="ml-2">
                        Late
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status, submission.is_late)}
                    <span className="capitalize">{submission.status}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {submission.total_score !== undefined ? (
                    <Badge
                      variant="outline"
                      className={getGradeColor(submission.total_score)}
                    >
                      {submission.total_score}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex gap-2">
                    {submission.submission_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(submission.submission_url, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGradeClick(submission)}
                    >
                      {submission.status === "graded" ? "Edit Grade" : "Grade"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
