import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, Upload, Star } from "lucide-react";

interface Assignment {
  id: number;
  title: string;
  type: string;
  status: string;
  dueDate: string;
  createdDate: string;
  submissions: number;
  totalStudents: number;
  maxScore: number;
  averageGrade: number;
  groupType: string;
}

interface AssignmentStatsCardsProps {
  assignments: Assignment[];
}

export default function AssignmentStatsCards({
  assignments,
}: AssignmentStatsCardsProps) {
  // Add null safety and debugging
  const safeAssignments = assignments || [];
  const totalAssignments = safeAssignments.length;

  // Filter active assignments with better logic
  const activeAssignments = safeAssignments.filter((a) => {
    // Check for active status first
    if (a.status === "active") return true;

    // For assignments without clear status, check due date
    if (!a.status || a.status === "draft") {
      try {
        const dueDate = new Date(a.dueDate);
        const now = new Date();
        // Consider as active if due date is in the future
        return dueDate > now;
      } catch (e) {
        // If date parsing fails, don't count as active
        return false;
      }
    }

    return false;
  }).length;

  const totalSubmissions = safeAssignments.reduce(
    (sum, a) => sum + (a.submissions || 0),
    0
  );

  // Calculate average grade only for assignments that have been graded
  const assignmentsWithGrades = safeAssignments.filter(
    (a) => a.averageGrade != null && a.averageGrade > 0
  );
  const averageGrade =
    assignmentsWithGrades.length > 0
      ? (
          assignmentsWithGrades.reduce((sum, a) => sum + a.averageGrade, 0) /
          assignmentsWithGrades.length
        ).toFixed(1)
      : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Assignments
              </p>
              <p className="text-2xl font-bold">{totalAssignments}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active
              </p>
              <p className="text-2xl font-bold">{activeAssignments}</p>
              <p className="text-xs text-muted-foreground">
                {totalAssignments > 0
                  ? `${Math.round(
                      (activeAssignments / totalAssignments) * 100
                    )}% of total`
                  : "No assignments"}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Submissions
              </p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
              <p className="text-xs text-muted-foreground">
                Across all assignments
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Upload className="h-4 w-4 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Grade
              </p>
              <p className="text-2xl font-bold">
                {averageGrade === "0" ? "N/A" : `${averageGrade}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignmentsWithGrades.length > 0
                  ? `From ${assignmentsWithGrades.length} graded`
                  : "No grades yet"}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Star className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
