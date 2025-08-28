import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAssignmentSubmissions,
  updateSubmissionGrade,
} from "@/lib/api/assignments";
import GradingHeader from "./grading/grading-header";
import StatsCards from "./grading/stats-cards";
import Filters from "./grading/filters";
import SubmissionsTable from "./grading/submissions-table";
import GradingForm from "./grading/grading-form";

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

interface GradingRubric {
  id: string;
  criteria_name: string;
  criteria_description?: string;
  max_points: number;
  order_index: number;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  max_score: number;
  due_date: string;
  group_id: string;
  assignment_rubrics?: GradingRubric[];
}

interface GradingSystemProps {
  assignment: Assignment;
  onBack: () => void;
}

export default function GradingSystem({
  assignment,
  onBack,
}: GradingSystemProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Fetch submissions for this assignment
  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const submissionsData = await getAssignmentSubmissions(assignment.id);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      showToast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (
    grade: string,
    feedback: string,
    rubricScores: Record<string, number>
  ) => {
    if (!selectedSubmission || !grade) return;

    try {
      await updateSubmissionGrade(
        selectedSubmission.id,
        parseFloat(grade),
        feedback,
        rubricScores
      );

      const updatedSubmissions = submissions.map((sub) =>
        sub.id === selectedSubmission.id
          ? {
              ...sub,
              status: "graded" as const,
              total_score: parseFloat(grade),
              feedback: feedback,
            }
          : sub
      );

      setSubmissions(updatedSubmissions);
      setShowGradingModal(false);
      setSelectedSubmission(null);

      showToast({
        title: "Success",
        description: "Grade saved successfully!",
      });
    } catch (error) {
      console.error("Error saving grade:", error);
      showToast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive",
      });
    }
  };

  const openGradingForm = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowGradingModal(true);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = filterStatus === "all" || sub.status === filterStatus;
    const matchesSearch =
      sub.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <GradingHeader
          assignment={assignment}
          submissions={submissions}
          onBack={onBack}
        />

        {/* Stats */}
        <StatsCards submissions={submissions} />

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Filters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
          />
        </div>

        {/* Student Submissions List */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Student Submissions
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredSubmissions.length} submissions
            </span>
          </div>

          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => openGradingForm(submission)}
                className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                      {submission.student?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {submission.student?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.student?.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        Submitted:{" "}
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.total_score !== undefined ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {submission.total_score}/{assignment.max_score}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        Pending
                      </span>
                    )}
                    {submission.is_late && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Late
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      <Dialog open={showGradingModal} onOpenChange={setShowGradingModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Grade Submission - {selectedSubmission?.student?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-0">
            {selectedSubmission && (
              <GradingForm
                submission={selectedSubmission}
                assignment={assignment}
                onSave={handleGradeSubmission}
                onBack={() => {
                  setShowGradingModal(false);
                  setSelectedSubmission(null);
                }}
                isInSidePanel={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
