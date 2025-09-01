"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QrCode,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Eye,
  Smartphone,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  getStudentAttendanceSummary,
  getGroupActiveSession,
  canMarkAttendance,
  getStudentSessionHistory,
} from "@/lib/api/attendance";
import { useUserStore } from "@/lib/store";
import {
  AttendanceSummary,
  AttendanceSession,
  AttendanceRecord,
} from "@/types";
import Link from "next/link";

interface StudentAttendanceViewProps {
  groupId: string;
  groupName: string;
}

export default function StudentAttendanceView({
  groupId,
  groupName,
}: StudentAttendanceViewProps) {
  const { user } = useUserStore();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null
  );
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [canMark, setCanMark] = useState<boolean>(false);
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      loadAttendanceData();
    }
  }, [user, groupId]);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      console.log(
        "Loading attendance data for user:",
        user?.id,
        "group:",
        groupId
      );

      // Load attendance summary
      const attendanceSummary = await getStudentAttendanceSummary(
        user!.id,
        groupId
      );
      setSummary(attendanceSummary);

      // Load session history
      const sessionHistoryData = await getStudentSessionHistory(
        user!.id,
        groupId
      );
      console.log("Session history data received:", sessionHistoryData);
      setSessionHistory(sessionHistoryData);

      // Check for active session
      const currentSession = await getGroupActiveSession(groupId);
      setActiveSession(currentSession);

      // Check if student can mark attendance
      if (currentSession) {
        const eligibility = await canMarkAttendance(
          currentSession.id,
          user!.id
        );
        setCanMark(eligibility.canMark);
        setExistingRecord(eligibility.existingRecord || null);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceStatus = (percentage: number, required: number) => {
    if (percentage >= required) {
      return { status: "good", color: "text-green-600", icon: CheckCircle };
    } else if (percentage >= required - 10) {
      return {
        status: "warning",
        color: "text-yellow-600",
        icon: AlertTriangle,
      };
    } else {
      return { status: "critical", color: "text-red-600", icon: AlertTriangle };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500 hover:bg-green-600";
      case "late":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "absent":
        return "bg-red-500 hover:bg-red-600";
      case "excused":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const attendanceStatusInfo = summary
    ? getAttendanceStatus(summary.attendance_percentage, 75) // Assuming 75% minimum
    : { status: "unknown", color: "text-gray-600", icon: AlertTriangle };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Attendance Overview</h2>
        <p className="text-gray-600">{groupName}</p>
      </div>

      {/* Active Session Alert */}
      {activeSession && activeSession.status === "active" && (
        <Alert
          className={
            canMark
              ? "border-green-500 bg-green-50"
              : "border-blue-500 bg-blue-50"
          }
        >
          <QrCode className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {canMark
                  ? "Attendance Session Active"
                  : "Attendance Already Marked"}
              </p>
              <p className="text-sm">
                {activeSession.session_name} • {activeSession.session_type}
                {activeSession.qr_status === "active" && (
                  <span className="ml-2 text-green-600">
                    (QR expires in{" "}
                    {Math.round(activeSession.minutes_until_qr_expiry || 0)}{" "}
                    min)
                  </span>
                )}
              </p>
              {existingRecord && (
                <Badge
                  className={`mt-2 ${getStatusColor(existingRecord.status)}`}
                >
                  Marked as {existingRecord.status}
                </Badge>
              )}
            </div>
            {canMark && activeSession.qr_status === "active" && (
              <Button asChild>
                <Link href="/attendance/scanner">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Attendance Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Overall Attendance
                </CardTitle>
                <attendanceStatusInfo.icon
                  className={`h-4 w-4 ${attendanceStatusInfo.color}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${attendanceStatusInfo.color}`}
                >
                  {summary
                    ? `${summary.attendance_percentage.toFixed(1)}%`
                    : "N/A"}
                </div>
                <div className="space-y-2 mt-2">
                  <Progress
                    value={summary?.attendance_percentage || 0}
                    className="w-full h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {summary
                      ? `${summary.attended_sessions}/${summary.total_sessions} sessions`
                      : "No data available"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions Attended
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary?.attended_sessions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Present: {summary?.present_sessions || 0} • Late:{" "}
                  {summary?.late_sessions || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions Missed
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summary?.absent_sessions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary && summary.excused_sessions > 0
                    ? `Excused: ${summary.excused_sessions}`
                    : "Unexcused absences"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Attendance Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current Attendance</span>
                      <span className={attendanceStatusInfo.color}>
                        {summary
                          ? `${summary.attendance_percentage.toFixed(1)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <Progress
                      value={summary?.attendance_percentage || 0}
                      className="w-full h-3"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Required Attendance</span>
                      <span className="text-gray-600">75.0%</span>
                    </div>
                    <Progress value={75} className="w-full h-2 opacity-50" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge
                      variant={
                        attendanceStatusInfo.status === "good"
                          ? "default"
                          : "destructive"
                      }
                      className={
                        attendanceStatusInfo.status === "good"
                          ? "bg-green-500"
                          : ""
                      }
                    >
                      {attendanceStatusInfo.status === "good"
                        ? "Meeting Requirements"
                        : attendanceStatusInfo.status === "warning"
                        ? "At Risk"
                        : "Below Requirement"}
                    </Badge>
                  </div>

                  {summary && summary.attendance_percentage < 75 && (
                    <div className="text-sm space-y-1">
                      <p className="text-red-600 font-medium">
                        Action Required:
                      </p>
                      <p className="text-gray-600">
                        You need to attend{" "}
                        {Math.max(
                          0,
                          Math.ceil(
                            (75 * summary.total_sessions) / 100 -
                              summary.attended_sessions
                          )
                        )}{" "}
                        more sessions to meet the minimum requirement.
                      </p>
                    </div>
                  )}

                  {summary && summary.attendance_percentage >= 75 && (
                    <div className="text-sm">
                      <p className="text-green-600 font-medium">
                        Good Standing
                      </p>
                      <p className="text-gray-600">
                        You&apos;re meeting the attendance requirements. Keep it
                        up!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Marked At</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionHistory.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">
                              {session.session_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {session.session_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                session.created_at
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusColor(
                                  session.attendance_status
                                )}
                              >
                                {session.attendance_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {session.marked_at ? (
                                <div className="text-sm">
                                  {new Date(
                                    session.marked_at
                                  ).toLocaleTimeString()}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.location_verified ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600">
                                    Verified
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No attendance sessions yet</p>
                  <p className="text-sm">
                    Sessions will appear here once your instructor starts taking
                    attendance
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Rate</span>
                    <span className="font-bold">
                      {summary
                        ? `${summary.attendance_percentage.toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Present</span>
                      <span className="text-green-600">
                        {summary?.present_sessions || 0} sessions
                      </span>
                    </div>
                    <Progress
                      value={
                        summary && summary.total_sessions > 0
                          ? (summary.present_sessions /
                              summary.total_sessions) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Late</span>
                      <span className="text-yellow-600">
                        {summary?.late_sessions || 0} sessions
                      </span>
                    </div>
                    <Progress
                      value={
                        summary && summary.total_sessions > 0
                          ? (summary.late_sessions / summary.total_sessions) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Absent</span>
                      <span className="text-red-600">
                        {summary?.absent_sessions || 0} sessions
                      </span>
                    </div>
                    <Progress
                      value={
                        summary && summary.total_sessions > 0
                          ? (summary.absent_sessions / summary.total_sessions) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>

                  {summary && summary.excused_sessions > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Excused</span>
                        <span className="text-blue-600">
                          {summary.excused_sessions} sessions
                        </span>
                      </div>
                      <Progress
                        value={
                          summary.total_sessions > 0
                            ? (summary.excused_sessions /
                                summary.total_sessions) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${attendanceStatusInfo.color}`}
                    >
                      {summary
                        ? `${summary.attendance_percentage.toFixed(0)}%`
                        : "N/A"}
                    </div>
                    <p className="text-sm text-gray-600">Overall Attendance</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {summary?.attended_sessions || 0}
                      </div>
                      <p className="text-xs text-gray-600">Attended</p>
                      <p className="text-xs text-gray-500">
                        {summary?.present_sessions || 0} present +{" "}
                        {summary?.late_sessions || 0} late
                      </p>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-red-600">
                        {summary?.absent_sessions || 0}
                      </div>
                      <p className="text-xs text-gray-600">Missed</p>
                      {summary && summary.excused_sessions > 0 && (
                        <p className="text-xs text-blue-600">
                          {summary.excused_sessions} excused
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    <p>Total Sessions: {summary?.total_sessions || 0}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status:</span>
                      <Badge
                        variant={
                          attendanceStatusInfo.status === "good"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          attendanceStatusInfo.status === "good"
                            ? "bg-green-500"
                            : ""
                        }
                      >
                        {attendanceStatusInfo.status === "good"
                          ? "On Track"
                          : attendanceStatusInfo.status === "warning"
                          ? "At Risk"
                          : "Needs Improvement"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-500" />
                How Attendance Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                    <QrCode className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium">Scan QR Code</h3>
                  <p className="text-sm text-gray-600">
                    When your instructor starts a session, scan the displayed QR
                    code
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium">Location Verified</h3>
                  <p className="text-sm text-gray-600">
                    Your location is checked to ensure you&apos;re in the
                    classroom
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium">Attendance Marked</h3>
                  <p className="text-sm text-gray-600">
                    Your attendance is automatically recorded and counted
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> You must be physically present in
                  the classroom to mark attendance. Location verification
                  prevents proxy attendance and ensures accuracy.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
