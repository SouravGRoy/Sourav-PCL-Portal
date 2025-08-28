import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, ExternalLink, Calculator } from "lucide-react";

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
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
  max_score: number;
  assignment_rubrics?: GradingRubric[];
}

interface GradingFormProps {
  submission: Submission;
  assignment: Assignment;
  onSave: (
    grade: string,
    feedback: string,
    rubricScores: Record<string, number>
  ) => void;
  onBack: () => void;
  isInSidePanel?: boolean;
}

export default function GradingForm({
  submission,
  assignment,
  onSave,
  onBack,
  isInSidePanel = false,
}: GradingFormProps) {
  const [grade, setGrade] = useState(submission.total_score?.toString() || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [showRubricModal, setShowRubricModal] = useState(false);

  const calculateFromRubric = () => {
    const totalScore = Object.values(rubricScores).reduce(
      (sum, score) => sum + score,
      0
    );
    setGrade(totalScore.toString());
  };

  const handleSave = () => {
    onSave(grade, feedback, rubricScores);
  };

  if (isInSidePanel) {
    return (
      <div className="space-y-6">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg border border-white/20 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl">
                {submission.student?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">Grading Submission</h2>
                <h3 className="text-lg font-semibold text-blue-100">
                  {submission.student?.name}
                </h3>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={!grade}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 shadow-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {submission.status === "graded" ? "Update Grade" : "Save Grade"}
            </Button>
          </div>
        </div>

        {/* Rest of the form content */}
        <div className="space-y-6">
          {/* Submission Details */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-t-lg">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full mr-3"></div>
                Submission Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">
                      Submitted On
                    </Label>
                    <p className="text-base text-gray-900">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {submission.submission_text && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Submission Text
                  </Label>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl text-sm max-h-40 overflow-y-auto">
                    {submission.submission_text}
                  </div>
                </div>
              )}

              {submission.submission_url && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Submission Link
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      value={submission.submission_url}
                      readOnly
                      className="text-sm bg-white/50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(submission.submission_url, "_blank")
                      }
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rubric Grading Button */}
          {assignment.assignment_rubrics &&
            assignment.assignment_rubrics.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                  <CardTitle className="text-lg font-bold text-purple-900 flex items-center">
                    <div className="w-2 h-6 bg-gradient-to-b from-purple-500 to-violet-500 rounded-full mr-3"></div>
                    Rubric Grading
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Use the assignment rubric to grade this submission
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">
                          Current rubric total:
                        </span>
                        <span className="font-bold text-lg text-purple-700">
                          {Object.values(rubricScores).reduce(
                            (sum, score) => sum + score,
                            0
                          )}{" "}
                          / {assignment.max_score}
                        </span>
                      </div>
                    </div>
                    <Dialog
                      open={showRubricModal}
                      onOpenChange={setShowRubricModal}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                          <Calculator className="h-4 w-4 mr-2" />
                          Open Rubric
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Grading Rubric - {assignment.title}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 p-4">
                          {assignment.assignment_rubrics
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((criterion) => (
                              <div
                                key={criterion.id}
                                className="bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-violet-400 rounded-full"></div>
                                      <h4 className="font-semibold text-gray-800">
                                        {criterion.criteria_name}
                                      </h4>
                                    </div>
                                    {criterion.criteria_description && (
                                      <p className="text-sm text-gray-600 ml-5 leading-relaxed">
                                        {criterion.criteria_description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 ml-4">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      max={criterion.max_points}
                                      min="0"
                                      step="0.5"
                                      className="w-20 text-center text-sm bg-white/70 border-purple-200 focus:border-purple-400"
                                      value={rubricScores[criterion.id] || ""}
                                      onChange={(e) =>
                                        setRubricScores({
                                          ...rubricScores,
                                          [criterion.id]:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                    />
                                    <div className="text-sm font-medium text-gray-600">
                                      / {criterion.max_points}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mt-6">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-green-800 flex items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                Total from Rubrics:
                              </span>
                              <span className="font-bold text-xl text-green-700">
                                {Object.values(rubricScores).reduce(
                                  (sum, score) => sum + score,
                                  0
                                )}{" "}
                                / {assignment.max_score}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => setShowRubricModal(false)}
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() => {
                                const total = Object.values(
                                  rubricScores
                                ).reduce((sum, score) => sum + score, 0);
                                setGrade(total.toString());
                                setShowRubricModal(false);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Apply to Grade
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Final Grade */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <CardTitle className="text-lg font-bold text-green-900 flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full mr-3"></div>
                Final Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-3">
                <Label
                  htmlFor="grade"
                  className="text-sm font-semibold text-gray-700 flex items-center"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Grade (out of {assignment.max_score})
                </Label>
                <Input
                  id="grade"
                  type="number"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder={`0-${assignment.max_score}`}
                  min="0"
                  max={assignment.max_score}
                  className="text-lg font-semibold bg-white/70 border-green-200 focus:border-green-400"
                />
              </div>
              {assignment.assignment_rubrics &&
                assignment.assignment_rubrics.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={calculateFromRubric}
                    className="w-full bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-violet-100"
                    size="sm"
                  >
                    ✨ Calculate from Rubric
                  </Button>
                )}
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
              <CardTitle className="text-lg font-bold text-orange-900 flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full mr-3"></div>
                Student Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide constructive feedback to help the student improve..."
                rows={5}
                className="bg-white/70 border-orange-200 focus:border-orange-400 resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Submissions
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Grade Submission
                  </h1>
                  <h2 className="text-lg font-semibold text-blue-600">
                    {submission.student?.name}
                  </h2>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={!grade}
                className="px-6 py-2"
              >
                <Save className="h-4 w-4 mr-2" />
                {submission.status === "graded" ? "Update" : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Student</Label>
                    <p className="text-sm">{submission.student?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted</Label>
                    <p className="text-sm">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {submission.submission_text && (
                  <div>
                    <Label className="text-sm font-medium">
                      Submission Text
                    </Label>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      {submission.submission_text}
                    </div>
                  </div>
                )}

                {submission.submission_url && (
                  <div>
                    <Label className="text-sm font-medium">
                      Submission Link
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={submission.submission_url}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(submission.submission_url, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rubric Grading */}
            {assignment.assignment_rubrics &&
              assignment.assignment_rubrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900">
                      Rubric Grading
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.assignment_rubrics
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((criterion) => (
                        <div key={criterion.id} className="border rounded p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {criterion.criteria_name}
                              </h4>
                              {criterion.criteria_description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {criterion.criteria_description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="0"
                                max={criterion.max_points}
                                min="0"
                                step="0.5"
                                className="w-20 text-center"
                                value={rubricScores[criterion.id] || ""}
                                onChange={(e) =>
                                  setRubricScores({
                                    ...rubricScores,
                                    [criterion.id]:
                                      parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                              <span className="text-sm">
                                / {criterion.max_points}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    <div className="bg-blue-50 border-2 border-blue-200 rounded p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          Total from Rubrics:
                        </span>
                        <span className="text-lg font-bold">
                          {Object.values(rubricScores).reduce(
                            (sum, score) => sum + score,
                            0
                          )}{" "}
                          / {assignment.max_score}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Final Grade and Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Final Grade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="grade">
                      Grade (out of {assignment.max_score})
                    </Label>
                    <Input
                      id="grade"
                      type="number"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder={`0-${assignment.max_score}`}
                      min="0"
                      max={assignment.max_score}
                    />
                  </div>
                  {assignment.assignment_rubrics &&
                    assignment.assignment_rubrics.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={calculateFromRubric}
                        className="w-full"
                      >
                        Calculate from Rubric
                      </Button>
                    )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback to the student..."
                    rows={6}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
