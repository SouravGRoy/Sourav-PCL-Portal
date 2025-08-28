import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star } from "lucide-react";
import { useState } from "react";

interface Assignment {
  title: string;
  due_date: string;
  max_score: number;
}

interface Submission {
  id: string;
  student_id: string;
  submission_text?: string;
  submission_url?: string;
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

interface GradingHeaderProps {
  assignment: Assignment;
  submissions?: Submission[];
  onBack: () => void;
}

export default function GradingHeader({
  assignment,
  submissions = [],
  onBack,
}: GradingHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportGrades = async () => {
    try {
      setIsExporting(true);

      // Create CSV content
      const headers = [
        "Student Name",
        "Email",
        "Submission Status",
        "Score",
        "Max Score",
        "Percentage",
        "Submitted At",
        "Late Submission",
        "Feedback",
      ];

      const csvContent = [
        headers.join(","),
        ...submissions.map((submission) => {
          const studentName = submission.student?.name || "Unknown";
          const studentEmail = submission.student?.email || "N/A";
          const score = submission.total_score ?? "";
          const percentage = submission.total_score
            ? Math.round((submission.total_score / assignment.max_score) * 100)
            : "";
          const submittedAt = submission.submitted_at
            ? new Date(submission.submitted_at).toLocaleDateString()
            : "Not submitted";
          const feedback = submission.feedback
            ? `"${submission.feedback.replace(/"/g, '""')}"`
            : "";

          return [
            `"${studentName}"`,
            `"${studentEmail}"`,
            submission.status,
            score,
            assignment.max_score,
            percentage ? `${percentage}%` : "",
            `"${submittedAt}"`,
            submission.is_late ? "Yes" : "No",
            feedback,
          ].join(",");
        }),
      ].join("\n");

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${assignment.title
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_grades.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting grades:", error);
      alert("Failed to export grades. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        {/* Left: Back + Details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-gray-300 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Grading Dashboard
              </h1>
            </div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ml-5">
              {assignment.title}
            </h2>
            <div className="flex items-center space-x-4 ml-5 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                <span>Max Score: {assignment.max_score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleExportGrades}
            disabled={isExporting || submissions.length === 0}
            className="bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border-emerald-200 text-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Grades"}
          </Button>
          <Button
            variant="outline"
            className="bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-purple-200 text-purple-700 shadow-sm"
          >
            <Star className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
        </div>
      </div>
    </div>
  );
}
