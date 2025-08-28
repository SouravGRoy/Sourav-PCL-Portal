import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserStore } from "@/lib/store";
import { getSubmissionById } from "@/lib/api/submissions";
import {
  getAssignmentDetails,
  updateSubmissionGrade,
} from "@/lib/api/assignments";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date-utils";

interface SubmissionFeedbackFormProps {
  submissionId: string;
}

interface RubricScore {
  [rubricId: string]: number;
}

export default function SubmissionFeedbackForm({
  submissionId,
}: SubmissionFeedbackFormProps) {
  const [submission, setSubmission] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [studentName, setStudentName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [totalScore, setTotalScore] = useState<number>(0);
  const [rubricScores, setRubricScores] = useState<RubricScore>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      if (!submissionId) return;

      try {
        // Fetch submission details
        const submissionData = await getSubmissionById(submissionId);
        setSubmission(submissionData);
        setFeedback(submissionData.feedback || "");
        setTotalScore(submissionData.total_score || 0);

        // Fetch assignment details with rubrics
        const assignmentData = await getAssignmentDetails(
          submissionData.assignment_id
        );
        setAssignment(assignmentData);

        // Fetch existing rubric scores if any
        if (submissionData.status === "graded") {
          const { data: existingScores } = await supabase
            .from("assignment_submission_scores")
            .select("rubric_id, score")
            .eq("submission_id", submissionId);

          if (existingScores) {
            const scoreMap: RubricScore = {};
            existingScores.forEach((scoreEntry) => {
              scoreMap[scoreEntry.rubric_id] = scoreEntry.score;
            });
            setRubricScores(scoreMap);
          }
        }

        // Fetch student name
        const { data: studentData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", submissionData.student_id)
          .single();

        if (studentData) {
          setStudentName(studentData.name);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load submission details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissionDetails();
  }, [submissionId]);

  const handleRubricScoreChange = (rubricId: string, score: number) => {
    setRubricScores((prev) => ({
      ...prev,
      [rubricId]: score,
    }));

    // Auto-calculate total score
    const newScores = { ...rubricScores, [rubricId]: score };
    const total = Object.values(newScores).reduce((sum, s) => sum + s, 0);
    setTotalScore(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Calculate final total score if using rubrics
      let finalScore = totalScore;
      if (
        assignment?.assignment_rubrics &&
        assignment.assignment_rubrics.length > 0
      ) {
        finalScore = Object.values(rubricScores).reduce(
          (sum, score) => sum + score,
          0
        );
      }

      await updateSubmissionGrade(
        submissionId,
        finalScore,
        feedback,
        rubricScores
      );

      router.push(`/assignments/${submission.assignment_id}/submissions`);
    } catch (error: any) {
      setError(error.message || "Failed to submit grade and feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading submission details...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!submission || !assignment) {
    return <div className="text-center p-8">Submission not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review Submission</CardTitle>
          <CardDescription className="text-lg">
            {assignment?.title} - Submitted by {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submission Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Submission Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Submitted On:
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDateTime(submission.submitted_at)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status:</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                    submission.status === "graded"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {submission.status === "graded" ? "Graded" : "Pending Review"}
                </span>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700">
                  Submission URL:
                </p>
                <a
                  href={submission.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all mt-1 inline-block"
                >
                  {submission.submission_url}
                </a>
              </div>
            </div>
          </div>

          {/* Grading Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rubric Grading */}
            {assignment?.assignment_rubrics &&
              assignment.assignment_rubrics.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-900">
                    Rubric-Based Grading
                  </h3>
                  <div className="space-y-4">
                    {assignment.assignment_rubrics
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((rubric: any) => (
                        <div
                          key={rubric.id}
                          className="bg-white rounded-lg p-4 border border-blue-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {rubric.criteria_name}
                              </h4>
                              {rubric.criteria_description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {rubric.criteria_description}
                                </p>
                              )}
                            </div>
                            <div className="ml-4 flex items-center space-x-2">
                              <Input
                                type="number"
                                min="0"
                                max={rubric.max_points}
                                step="0.5"
                                value={rubricScores[rubric.id] || 0}
                                onChange={(e) =>
                                  handleRubricScoreChange(
                                    rubric.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-gray-500">
                                / {rubric.max_points}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    <div className="bg-blue-100 rounded-lg p-4 border-2 border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">
                          Total Score:
                        </span>
                        <span className="text-xl font-bold text-blue-900">
                          {Object.values(rubricScores).reduce(
                            (sum, score) => sum + score,
                            0
                          )}{" "}
                          / {assignment.max_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Manual Grading (if no rubrics) */}
            {(!assignment?.assignment_rubrics ||
              assignment.assignment_rubrics.length === 0) && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Manual Grading</h3>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="totalScore"
                      className="text-base font-medium"
                    >
                      Total Score (out of {assignment?.max_score || 100})
                    </Label>
                    <Input
                      id="totalScore"
                      type="number"
                      min="0"
                      max={assignment?.max_score || 100}
                      step="0.5"
                      value={totalScore}
                      onChange={(e) =>
                        setTotalScore(parseFloat(e.target.value) || 0)
                      }
                      className="w-32 mt-2"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Feedback</h3>
              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-base font-medium">
                  Detailed Feedback for Student
                </Label>
                <textarea
                  id="feedback"
                  className="w-full p-4 border border-gray-300 rounded-lg min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback, highlighting strengths and areas for improvement..."
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="px-8">
                {isSubmitting
                  ? "Saving..."
                  : submission.status === "graded"
                  ? "Update Grade & Feedback"
                  : "Submit Grade & Feedback"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
