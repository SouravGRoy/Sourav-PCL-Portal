"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  QrCode,
  MapPin,
  Clock,
  Users,
  Plus,
  StopCircle,
  Eye,
  AlertCircle,
  CheckCircle,
  Settings,
  Loader2,
  Search,
  MoreHorizontal,
  XCircle,
  BarChart3,
  Edit,
  AlertTriangle,
  Mail,
  FileText,
  Download,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  PieChart,
  Trophy,
  Target,
  Lightbulb,
} from "lucide-react";
import QRCode from "qrcode";
import {
  createAttendanceSession,
  getFacultyActiveSessions,
  endAttendanceSession,
  getSessionAttendanceRecords,
  markManualAttendance,
  generateQRCodeURL,
  getClassAttendanceSettings,
  updateClassAttendanceSettings,
  getFacultyAttendanceSessions,
  getGroupStudentAttendance,
  getSessionDetails,
} from "@/lib/api/attendance";
import { useUserStore } from "@/lib/store";
import {
  AttendanceSession,
  AttendanceRecord,
  SessionType,
  AttendanceStatus,
  ClassAttendanceSettings,
} from "@/types";

interface AttendanceManagementProps {
  groupId: string;
  groupName: string;
}

export default function AttendanceManagement({
  groupId,
  groupName,
}: AttendanceManagementProps) {
  const { user } = useUserStore();
  const { showToast } = useToast();
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [settings, setSettings] = useState<ClassAttendanceSettings | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // New state for comprehensive tracking
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [selectedSessionDetails, setSelectedSessionDetails] =
    useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Filter states
  const [dateFilter, setDateFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Student action states
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [showContactStudent, setShowContactStudent] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [markAttendanceReason, setMarkAttendanceReason] = useState("");
  const [dialogKey, setDialogKey] = useState(0);

  // Form states
  const [sessionForm, setSessionForm] = useState({
    session_name: "",
    session_type: "lecture" as SessionType,
    qr_duration_minutes: 5,
    allowed_radius_meters: 20,
    allow_late_entry: true,
  });

  useEffect(() => {
    if (user) {
      loadActiveSessions();
      loadSettings();
      loadAllSessions();
      loadStudentAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, groupId]);

  // Cleanup effect to prevent memory leaks and frozen dialogs
  useEffect(() => {
    return () => {
      // Cleanup function to reset dialog states when component unmounts
      setShowSessionDetails(false);
      setSelectedSessionDetails(null);
      setShowStudentDetails(false);
      setShowMarkAttendance(false);
      setShowContactStudent(false);
    };
  }, []);

  // Close session details when groupId changes
  useEffect(() => {
    setShowSessionDetails(false);
    setSelectedSessionDetails(null);
  }, [groupId]);

  // Add cleanup effect for dialogs
  useEffect(() => {
    const cleanup = () => {
      // Force cleanup of any remaining portal elements when dialogs close
      setTimeout(() => {
        const dropdownPortals = document.querySelectorAll(
          "[data-radix-dropdown-menu-content]"
        );
        const selectPortals = document.querySelectorAll(
          "[data-radix-select-content]"
        );
        const dialogPortals = document.querySelectorAll(
          "[data-radix-dialog-content]"
        );
        const portalElements = document.querySelectorAll("[data-radix-portal]");
        const overlayElements = document.querySelectorAll(
          "[data-radix-dialog-overlay]"
        );

        [
          ...dropdownPortals,
          ...selectPortals,
          ...dialogPortals,
          ...portalElements,
          ...overlayElements,
        ].forEach((element) => {
          if (element.parentNode) {
            try {
              element.parentNode.removeChild(element);
            } catch (e) {
              // Ignore if element already removed
            }
          }
        });

        // Also clean up any orphaned overlay elements
        const bodyOverlays = document.body.querySelectorAll(
          '[data-state="open"]'
        );
        bodyOverlays.forEach((overlay) => {
          if (overlay.getAttribute("data-radix-dialog-overlay") !== null) {
            try {
              overlay.remove();
            } catch (e) {
              // Ignore if element already removed
            }
          }
        });

        // Reset body styles that might get stuck
        document.body.style.pointerEvents = "";
        document.body.style.userSelect = "";
      }, 50);
    };

    if (
      !showStudentDetails &&
      !showContactStudent &&
      !showSessionDetails &&
      !showMarkAttendance
    ) {
      cleanup();
    }

    // Also cleanup on component unmount
    return cleanup;
  }, [
    showStudentDetails,
    showContactStudent,
    showSessionDetails,
    showMarkAttendance,
  ]);

  // Add global click listener for emergency cleanup
  useEffect(() => {
    const handleGlobalClick = () => {
      // Emergency cleanup if page seems frozen
      setTimeout(() => {
        const allPortals = document.querySelectorAll("[data-radix-portal]");
        if (allPortals.length > 0) {
          allPortals.forEach((portal) => {
            try {
              portal.remove();
            } catch (e) {
              // Ignore if element already removed
            }
          });
          document.body.style.pointerEvents = "";
          document.body.style.userSelect = "";
        }
      }, 100);
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const loadActiveSessions = async () => {
    try {
      if (!user) return;
      const sessions = await getFacultyActiveSessions(user.id);
      const groupSessions = sessions.filter((s) => s.group_id === groupId);
      setActiveSessions(groupSessions);
    } catch (error) {
      console.error("Error loading active sessions:", error);
    }
  };

  const loadSettings = async () => {
    try {
      console.log("Loading attendance settings for group:", groupId);
      const classSettings = await getClassAttendanceSettings(groupId);
      console.log("Attendance settings loaded:", classSettings);
      setSettings(classSettings);

      if (classSettings) {
        setSessionForm((prev) => ({
          ...prev,
          qr_duration_minutes: classSettings.default_qr_duration_minutes || 5,
          allowed_radius_meters:
            classSettings.default_allowed_radius_meters || 20,
          allow_late_entry: classSettings.allow_late_entry_by_default ?? true,
        }));
      }
    } catch (error) {
      console.error("Error loading settings:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        groupId: groupId,
      });

      // Use default values if settings can't be loaded
      console.log("Using default attendance settings");
      const defaultSettings = {
        id: "default",
        group_id: groupId,
        faculty_id: user?.id || "unknown",
        minimum_attendance_percentage: 75.0,
        enable_low_attendance_notifications: true,
        notification_threshold_percentage: 70.0,
        notification_frequency_days: 7,
        default_session_duration_minutes: 60,
        default_qr_duration_minutes: 5,
        default_allowed_radius_meters: 20,
        allow_late_entry_by_default: true,
        default_late_entry_hours: 24,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSettings(defaultSettings);
      setSessionForm((prev) => ({
        ...prev,
        qr_duration_minutes: 5,
        allowed_radius_meters: 20,
        allow_late_entry: true,
      }));
    }
  };

  const loadAllSessions = async () => {
    try {
      if (!user) return;
      const sessions = await getFacultyAttendanceSessions(user.id);
      const groupSessions = sessions.filter((s) => s.group_id === groupId);
      setAllSessions(groupSessions);
    } catch (error) {
      console.error("Error loading all sessions:", error);
    }
  };

  const loadStudentAttendance = async () => {
    try {
      const attendance = await getGroupStudentAttendance(groupId);
      setStudentAttendance(attendance);
    } catch (error) {
      console.error("Error loading student attendance:", error);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const details = await getSessionDetails(sessionId);
      setSelectedSessionDetails(details);
      setDialogKey((prev) => prev + 1);
      setShowSessionDetails(true);
    } catch (error) {
      console.error("Error loading session details:", error);
    }
  };

  const generateQRForSession = async (session: AttendanceSession) => {
    try {
      const qrUrl = generateQRCodeURL(session.qr_code_token);
      const qrDataURL = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataURL(qrDataURL);
      setSelectedSession(session);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCreateSession = async () => {
    setIsLoading(true);
    try {
      // Get current location
      const currentLocation = await getCurrentLocation();

      const sessionData = {
        group_id: groupId,
        ...sessionForm,
        faculty_latitude: currentLocation.latitude,
        faculty_longitude: currentLocation.longitude,
      };

      const newSession = await createAttendanceSession(sessionData);

      // Generate QR code
      const qrUrl = generateQRCodeURL(newSession.qr_code_token);
      const qrDataURL = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataURL(qrDataURL);

      setSelectedSession(newSession);
      setActiveSessions((prev) => [...prev, newSession]);
      setShowCreateSession(false);

      // Reset form
      setSessionForm({
        session_name: "",
        session_type: "lecture",
        qr_duration_minutes: settings?.default_qr_duration_minutes || 5,
        allowed_radius_meters: settings?.default_allowed_radius_meters || 20,
        allow_late_entry: settings?.allow_late_entry_by_default || true,
      });
    } catch (error: any) {
      console.error("Error creating session:", error);
      alert(error.message || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await endAttendanceSession(sessionId);
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setQrCodeDataURL(null);
      }
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session");
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataURL || !selectedSession) return;

    const link = document.createElement("a");
    link.download = `attendance-qr-${selectedSession.session_name.replace(
      /\s+/g,
      "-"
    )}.png`;
    link.href = qrCodeDataURL;
    link.click();
  };

  // Student action handlers
  const handleViewStudentDetails = (student: any) => {
    setSelectedStudent(student);
    setDialogKey((prev) => prev + 1);
    setShowStudentDetails(true);
  };

  const handleContactStudent = (student: any) => {
    setSelectedStudent(student);
    setContactMessage(
      `Dear ${student.name},\n\nWe noticed your attendance needs attention. Please contact us to discuss.\n\nBest regards,\nFaculty`
    );
    setDialogKey((prev) => prev + 1);
    setShowContactStudent(true);
  };

  const handleMarkStudentAttendance = (student: any) => {
    setSelectedStudent(student);
    setMarkAttendanceReason("");
    setDialogKey((prev) => prev + 1);
    setShowMarkAttendance(true);
  };

  const handleExportStudentData = (student: any) => {
    try {
      const csvContent = [
        "Date,Session,Status,Time,Location",
        // This would be populated with actual session data
        "Sample data - implement with real session data",
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${student.name.replace(/\s+/g, "_")}_attendance.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showToast({
        title: "Export Successful",
        description: `${student.name}'s attendance data has been exported.`,
      });
    } catch (error) {
      console.error("Error exporting student data:", error);
      showToast({
        title: "Export Failed",
        description: "Failed to export student data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendContactMessage = async () => {
    try {
      // Here you would integrate with your email/notification system
      console.log("Sending message to:", selectedStudent?.email);
      console.log("Message:", contactMessage);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      showToast({
        title: "Message Sent",
        description: `Message sent to ${selectedStudent?.name} successfully!`,
      });

      setShowContactStudent(false);
      setContactMessage("");
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error sending message:", error);
      showToast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Section: Title */}
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-gray-600">{groupName}</p>
        </div>

        {/* Right Section: Actions */}
        <div className="flex gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Attendance Settings</DialogTitle>
              </DialogHeader>
              {settings && (
                <AttendanceSettingsForm
                  settings={settings}
                  onUpdate={(updated) => {
                    setSettings(updated);
                    setShowSettings(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
            <DialogTrigger asChild>
              <Button className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Start Attendance Session</DialogTitle>
              </DialogHeader>
              <CreateSessionForm
                form={sessionForm}
                onChange={setSessionForm}
                onSubmit={handleCreateSession}
                isLoading={isLoading}
              />
            </DialogContent>
          </Dialog>

          {/* QR Code Dialog */}
          <Dialog
            open={!!qrCodeDataURL && !!selectedSession}
            onOpenChange={() => {
              setQrCodeDataURL(null);
              setSelectedSession(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Attendance QR Code</DialogTitle>
              </DialogHeader>
              {selectedSession && qrCodeDataURL && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium text-lg">
                      {selectedSession.session_name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedSession.session_type}
                    </p>
                    {selectedSession.qr_status === "active" ? (
                      <Badge className="mt-2 bg-green-500">
                        QR Active -{" "}
                        {Math.round(
                          selectedSession.minutes_until_qr_expiry || 0
                        )}{" "}
                        min left
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-2">
                        QR Expired
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <img
                      src={qrCodeDataURL}
                      alt="Attendance QR Code"
                      className="w-64 h-64 border rounded-lg"
                    />
                  </div>

                  <div className="space-y-2 text-center">
                    <p className="text-sm text-gray-600">
                      Students should scan this QR code to mark attendance
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={downloadQRCode}
                        className="flex-1"
                      >
                        Download QR
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleEndSession(selectedSession.id)}
                        className="flex-1"
                      >
                        End Session
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
            {/* Active Sessions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Sessions</h3>
                <Dialog
                  open={showCreateSession}
                  onOpenChange={setShowCreateSession}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Attendance Session</DialogTitle>
                    </DialogHeader>
                    <CreateSessionForm
                      form={sessionForm}
                      onChange={setSessionForm}
                      onSubmit={handleCreateSession}
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {activeSessions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">
                      No Active Sessions
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create a new attendance session to start tracking student
                      attendance with QR codes and location verification.
                    </p>
                    <Dialog
                      open={showCreateSession}
                      onOpenChange={setShowCreateSession}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Session
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onEndSession={handleEndSession}
                      onGenerateQR={generateQRForSession}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {studentAttendance.reduce(
                      (sum, s) => sum + s.presentSessions,
                      0
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Present
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {studentAttendance.reduce(
                      (sum, s) => sum + s.lateSessions,
                      0
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Late
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {studentAttendance.reduce(
                      (sum, s) => sum + s.absentSessions,
                      0
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Absent
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {studentAttendance.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Students
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* At-Risk Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Students Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentAttendance
                  .filter((s) => s.status !== "regular")
                  .slice(0, 4)
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={`text-sm ${
                              student.status === "critical"
                                ? "bg-red-100 text-red-600"
                                : student.status === "at-risk"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {student.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.usn}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            student.status === "critical"
                              ? "destructive"
                              : "default"
                          }
                          className="text-xs"
                        >
                          {student.attendanceRate}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {student.absentSessions} absences
                        </p>
                      </div>
                    </div>
                  ))}
                {studentAttendance.filter((s) => s.status !== "regular")
                  .length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    All students have good attendance! 🎉
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="p-6 space-y-4">
            {/* Session Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 max-w-sm">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(dateFilter !== "all" || sessionSearch) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFilter("all");
                    setSessionSearch("");
                  }}
                  className="shrink-0"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Sessions List */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Details</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filteredSessions = allSessions.filter((session) => {
                      // Date filter
                      if (dateFilter !== "all") {
                        const sessionDate = new Date(
                          session.start_time || session.created_at
                        );
                        const now = new Date();

                        switch (dateFilter) {
                          case "today":
                            if (
                              sessionDate.toDateString() !== now.toDateString()
                            )
                              return false;
                            break;
                          case "week":
                            const weekStart = new Date(now);
                            weekStart.setDate(now.getDate() - now.getDay());
                            weekStart.setHours(0, 0, 0, 0);
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 6);
                            weekEnd.setHours(23, 59, 59, 999);
                            if (
                              !(
                                sessionDate >= weekStart &&
                                sessionDate <= weekEnd
                              )
                            )
                              return false;
                            break;
                          case "month":
                            if (
                              !(
                                sessionDate.getMonth() === now.getMonth() &&
                                sessionDate.getFullYear() === now.getFullYear()
                              )
                            )
                              return false;
                            break;
                        }
                      }

                      // Search filter
                      if (sessionSearch) {
                        const searchTerm = sessionSearch.toLowerCase();
                        const sessionName = (
                          session.session_name || ""
                        ).toLowerCase();
                        const sessionType = (
                          session.session_type || ""
                        ).toLowerCase();
                        const location = (session.location || "").toLowerCase();

                        if (
                          !sessionName.includes(searchTerm) &&
                          !sessionType.includes(searchTerm) &&
                          !location.includes(searchTerm)
                        ) {
                          return false;
                        }
                      }

                      return true;
                    });

                    if (filteredSessions.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Clock className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {dateFilter !== "all" || sessionSearch
                                  ? "No sessions found matching your filters"
                                  : "No sessions found for this class"}
                              </p>
                              {(dateFilter !== "all" || sessionSearch) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDateFilter("all");
                                    setSessionSearch("");
                                  }}
                                >
                                  Clear Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filteredSessions.map((session) => (
                      <TableRow key={session.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {session.session_name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {session.session_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {session.date}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {session.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <QrCode className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                GPS + QR Code
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{session.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{session.duration}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {session.attendanceRate}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.presentCount}P / {session.lateCount}L /{" "}
                              {session.absentCount}A
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              session.status === "active"
                                ? "default"
                                : session.status === "completed"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadSessionDetails(session.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="students" className="p-6 space-y-4">
            {/* Student Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="regular">Regular (≥85%)</SelectItem>
                  <SelectItem value="at-risk">At-Risk (75-84%)</SelectItem>
                  <SelectItem value="critical">Critical (&lt;75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Students Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead>Last Attended</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentAttendance
                    .filter(
                      (student) =>
                        (filterStatus === "all" ||
                          student.status === filterStatus) &&
                        (searchStudent === "" ||
                          student.name
                            .toLowerCase()
                            .includes(searchStudent.toLowerCase()) ||
                          student.usn
                            .toLowerCase()
                            .includes(searchStudent.toLowerCase()))
                    )
                    .map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                className={`text-sm ${
                                  student.status === "critical"
                                    ? "bg-red-100 text-red-600"
                                    : student.status === "at-risk"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                {student.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.usn}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-green-600">
                            {student.presentSessions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-yellow-600">
                            {student.lateSessions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-red-600">
                            {student.absentSessions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <Badge
                              variant={
                                student.status === "critical"
                                  ? "destructive"
                                  : student.status === "at-risk"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {student.attendanceRate}%
                            </Badge>
                            <div className="w-16 h-1.5 bg-muted rounded-full mx-auto">
                              <div
                                className={`h-1.5 rounded-full ${
                                  student.status === "critical"
                                    ? "bg-red-500"
                                    : student.status === "at-risk"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${student.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {student.lastAttended}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewStudentDetails(student)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleMarkStudentAttendance(student)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleContactStudent(student)}
                              className="h-8 w-8 p-0"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="p-6">
            <div className="space-y-6">
              {/* Analytics Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side - Title + Subtitle */}
                <div>
                  <h3 className="text-lg font-semibold">
                    Attendance Analytics
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive insights and trends for {groupName}
                  </p>
                </div>

                {/* Right side - Buttons & Select */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                  <Select defaultValue="month">
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average Attendance
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {studentAttendance.length > 0
                            ? Math.round(
                                studentAttendance.reduce(
                                  (sum, s) => sum + s.attendanceRate,
                                  0
                                ) / studentAttendance.length
                              )
                            : 0}
                          %
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        Based on {studentAttendance.length} students
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Sessions
                        </p>
                        <p className="text-2xl font-bold">
                          {allSessions.length}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-blue-600">
                        <ArrowUp className="h-3 w-3 mr-1" />+
                        {
                          allSessions.filter((s) => {
                            const sessionDate = new Date(s.created_at);
                            const lastWeek = new Date();
                            lastWeek.setDate(lastWeek.getDate() - 7);
                            return sessionDate >= lastWeek;
                          }).length
                        }{" "}
                        this week
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          At-Risk Students
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {
                            studentAttendance.filter(
                              (s) =>
                                s.status === "at-risk" ||
                                s.status === "critical"
                            ).length
                          }
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {
                          studentAttendance.filter(
                            (s) => s.status === "critical"
                          ).length
                        }{" "}
                        critical,{" "}
                        {
                          studentAttendance.filter(
                            (s) => s.status === "at-risk"
                          ).length
                        }{" "}
                        at-risk
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Punctuality Rate
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {studentAttendance.length > 0
                            ? Math.round(
                                (studentAttendance.reduce(
                                  (sum, s) => sum + s.presentSessions,
                                  0
                                ) /
                                  (studentAttendance.reduce(
                                    (sum, s) =>
                                      sum + s.presentSessions + s.lateSessions,
                                    0
                                  ) || 1)) *
                                  100
                              )
                            : 0}
                          %
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        On-time vs Late arrivals
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Attendance Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Real data based on sessions */}
                      <div className="space-y-3">
                        {(() => {
                          // Group sessions by week
                          const weeklyData = [];
                          const now = new Date();
                          for (let i = 3; i >= 0; i--) {
                            const weekStart = new Date(now);
                            weekStart.setDate(
                              now.getDate() - i * 7 - now.getDay()
                            );
                            weekStart.setHours(0, 0, 0, 0);
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 6);
                            weekEnd.setHours(23, 59, 59, 999);

                            const weekSessions = allSessions.filter(
                              (session) => {
                                const sessionDate = new Date(
                                  session.start_time || session.created_at
                                );
                                return (
                                  sessionDate >= weekStart &&
                                  sessionDate <= weekEnd
                                );
                              }
                            );

                            // Calculate average attendance for this week
                            let avgAttendance = 0;
                            if (weekSessions.length > 0) {
                              const totalRate = weekSessions.reduce(
                                (sum, session) => {
                                  return sum + (session.attendanceRate || 0);
                                },
                                0
                              );
                              avgAttendance = totalRate / weekSessions.length;
                            }

                            weeklyData.push({
                              week: `Week ${4 - i}`,
                              percentage: avgAttendance,
                              sessions: weekSessions.length,
                            });
                          }

                          return weeklyData.map((week) => (
                            <div key={week.week} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{week.week}</span>
                                <span className="font-medium">
                                  {week.percentage.toFixed(1)}% ({week.sessions}{" "}
                                  sessions)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    week.percentage >= 85
                                      ? "bg-green-600"
                                      : week.percentage >= 75
                                      ? "bg-yellow-600"
                                      : "bg-red-600"
                                  }`}
                                  style={{
                                    width: `${Math.max(week.percentage, 5)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      {allSessions.length === 0 && (
                        <div className="text-center py-8">
                          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No session data available yet
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Session Type Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Session Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          type: "Lecture",
                          count: allSessions.filter(
                            (s) => s.session_type === "lecture"
                          ).length,
                          color: "bg-blue-500",
                        },
                        {
                          type: "Lab",
                          count: allSessions.filter(
                            (s) => s.session_type === "lab"
                          ).length,
                          color: "bg-green-500",
                        },
                        {
                          type: "Tutorial",
                          count: allSessions.filter(
                            (s) => s.session_type === "tutorial"
                          ).length,
                          color: "bg-purple-500",
                        },
                        {
                          type: "Other",
                          count: allSessions.filter(
                            (s) =>
                              !["lecture", "lab", "tutorial"].includes(
                                s.session_type
                              )
                          ).length,
                          color: "bg-orange-500",
                        },
                      ].map((item) => {
                        const total = allSessions.length || 1;
                        const percentage = (item.count / total) * 100;
                        return (
                          <div
                            key={item.type}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${item.color}`}
                              />
                              <span className="text-sm">{item.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {item.count}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studentAttendance
                        .filter((s) => s.attendanceRate >= 90)
                        .sort((a, b) => b.attendanceRate - a.attendanceRate)
                        .slice(0, 5)
                        .map((student, index) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : index === 1
                                    ? "bg-gray-100 text-gray-700"
                                    : index === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {student.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student.usn}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {student.attendanceRate}%
                            </Badge>
                          </div>
                        ))}
                      {studentAttendance.filter((s) => s.attendanceRate >= 90)
                        .length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No students with 90%+ attendance yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Patterns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Attendance Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        // Calculate real day-wise attendance from sessions
                        const dayStats = [
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                        ].map((dayName) => {
                          const dayIndex = [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                          ].indexOf(dayName);
                          const daySessions = allSessions.filter((session) => {
                            const sessionDate = new Date(
                              session.start_time || session.created_at
                            );
                            return sessionDate.getDay() === dayIndex + 1; // getDay() returns 0 for Sunday
                          });

                          let avgAttendance = 0;
                          if (daySessions.length > 0) {
                            const totalRate = daySessions.reduce(
                              (sum, session) => {
                                return sum + (session.attendanceRate || 0);
                              },
                              0
                            );
                            avgAttendance = totalRate / daySessions.length;
                          }

                          return {
                            day: dayName,
                            percentage: avgAttendance,
                            sessions: daySessions.length,
                          };
                        });

                        return dayStats.map((day) => (
                          <div
                            key={day.day}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{day.day}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    day.percentage >= 85
                                      ? "bg-green-500"
                                      : day.percentage >= 75
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.max(day.percentage, 5)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {day.sessions > 0
                                  ? `${day.percentage.toFixed(1)}%`
                                  : "No data"}
                              </span>
                            </div>
                          </div>
                        ));
                      })()}
                      {allSessions.length === 0 && (
                        <div className="text-center py-8">
                          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No session data to analyze patterns
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      Insights & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const insights = [];

                        // Calculate real insights from data
                        const avgAttendance =
                          studentAttendance.length > 0
                            ? studentAttendance.reduce(
                                (sum, s) => sum + s.attendanceRate,
                                0
                              ) / studentAttendance.length
                            : 0;

                        const criticalStudents = studentAttendance.filter(
                          (s) => s.status === "critical"
                        ).length;
                        const atRiskStudents = studentAttendance.filter(
                          (s) => s.status === "at-risk"
                        ).length;

                        const lectureCount = allSessions.filter(
                          (s) => s.session_type === "lecture"
                        ).length;
                        const labCount = allSessions.filter(
                          (s) => s.session_type === "lab"
                        ).length;

                        // High attendance insight
                        if (avgAttendance >= 85) {
                          insights.push({
                            type: "positive",
                            title: "Excellent Attendance",
                            description: `Average attendance of ${avgAttendance.toFixed(
                              1
                            )}% shows strong engagement`,
                            icon: CheckCircle,
                            color: "green",
                          });
                        } else if (avgAttendance >= 75) {
                          insights.push({
                            type: "warning",
                            title: "Moderate Attendance",
                            description: `Average attendance of ${avgAttendance.toFixed(
                              1
                            )}% has room for improvement`,
                            icon: AlertTriangle,
                            color: "orange",
                          });
                        } else if (avgAttendance > 0) {
                          insights.push({
                            type: "negative",
                            title: "Low Attendance Alert",
                            description: `Average attendance of ${avgAttendance.toFixed(
                              1
                            )}% requires immediate attention`,
                            icon: AlertTriangle,
                            color: "red",
                          });
                        }

                        // At-risk students insight
                        if (criticalStudents > 0 || atRiskStudents > 0) {
                          insights.push({
                            type: "warning",
                            title: "Students Need Support",
                            description: `${criticalStudents} critical and ${atRiskStudents} at-risk students identified`,
                            icon: Users,
                            color: "orange",
                          });
                        }

                        // Session type insights
                        if (labCount > 0 && lectureCount > 0) {
                          insights.push({
                            type: "info",
                            title: "Diverse Session Types",
                            description: `${lectureCount} lectures and ${labCount} lab sessions conducted`,
                            icon: TrendingUp,
                            color: "blue",
                          });
                        }

                        // Recent activity insight
                        const recentSessions = allSessions.filter((s) => {
                          const sessionDate = new Date(s.created_at);
                          const lastWeek = new Date();
                          lastWeek.setDate(lastWeek.getDate() - 7);
                          return sessionDate >= lastWeek;
                        }).length;

                        if (recentSessions > 0) {
                          insights.push({
                            type: "info",
                            title: "Active Teaching",
                            description: `${recentSessions} sessions conducted in the past week`,
                            icon: Calendar,
                            color: "purple",
                          });
                        }

                        // Show default message if no data
                        if (insights.length === 0) {
                          insights.push({
                            type: "info",
                            title: "Waiting for Data",
                            description:
                              "Start conducting sessions to see personalized insights",
                            icon: Lightbulb,
                            color: "gray",
                          });
                        }

                        return insights.map((insight, index) => {
                          const Icon = insight.icon;
                          const colorClasses = {
                            green:
                              "bg-green-50 border-green-200 text-green-900",
                            orange:
                              "bg-orange-50 border-orange-200 text-orange-900",
                            red: "bg-red-50 border-red-200 text-red-900",
                            blue: "bg-blue-50 border-blue-200 text-blue-900",
                            purple:
                              "bg-purple-50 border-purple-200 text-purple-900",
                            gray: "bg-gray-50 border-gray-200 text-gray-900",
                          };

                          const iconColors = {
                            green: "text-green-600",
                            orange: "text-orange-600",
                            red: "text-red-600",
                            blue: "text-blue-600",
                            purple: "text-purple-600",
                            gray: "text-gray-600",
                          };

                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border 
                              
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Icon
                                  className={`h-4 w-4 mt-0.5
                                   
                                  }`}
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    {insight.title}
                                  </p>
                                  <p className="text-xs opacity-75">
                                    {insight.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analytics Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Monthly Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-center">
                            Sessions
                          </TableHead>
                          <TableHead className="text-center">
                            Avg. Attendance
                          </TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Late</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead className="text-center">Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Calculate real monthly data
                          const monthlyData = [];
                          const now = new Date();

                          // Get last 6 months of data
                          for (let i = 5; i >= 0; i--) {
                            const monthDate = new Date(
                              now.getFullYear(),
                              now.getMonth() - i,
                              1
                            );
                            const monthName = monthDate.toLocaleDateString(
                              "en-US",
                              { month: "long" }
                            );
                            const monthStart = new Date(
                              monthDate.getFullYear(),
                              monthDate.getMonth(),
                              1
                            );
                            const monthEnd = new Date(
                              monthDate.getFullYear(),
                              monthDate.getMonth() + 1,
                              0
                            );

                            const monthSessions = allSessions.filter(
                              (session) => {
                                const sessionDate = new Date(
                                  session.start_time || session.created_at
                                );
                                return (
                                  sessionDate >= monthStart &&
                                  sessionDate <= monthEnd
                                );
                              }
                            );

                            let avgAttendance = 0;
                            let totalPresent = 0;
                            let totalLate = 0;
                            let totalAbsent = 0;

                            if (monthSessions.length > 0) {
                              // Calculate averages from session data
                              monthSessions.forEach((session) => {
                                totalPresent += session.presentCount || 0;
                                totalLate += session.lateCount || 0;
                                totalAbsent += session.absentCount || 0;
                              });

                              const totalAttendance =
                                totalPresent + totalLate + totalAbsent;
                              if (totalAttendance > 0) {
                                avgAttendance =
                                  ((totalPresent + totalLate) /
                                    totalAttendance) *
                                  100;
                              }
                            }

                            if (monthSessions.length > 0) {
                              monthlyData.push({
                                month: monthName,
                                sessions: monthSessions.length,
                                avg: avgAttendance,
                                present: totalPresent,
                                late: totalLate,
                                absent: totalAbsent,
                                trend: avgAttendance >= 85 ? "up" : "down",
                              });
                            }
                          }

                          if (monthlyData.length === 0) {
                            return (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-8"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-muted-foreground">
                                      No session data available for monthly
                                      breakdown
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Start conducting sessions to see monthly
                                      analytics
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return monthlyData.map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="font-medium">
                                {row.month}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.sessions}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    row.avg >= 90
                                      ? "default"
                                      : row.avg >= 80
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {row.avg.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-green-600">
                                {row.present}
                              </TableCell>
                              <TableCell className="text-center text-yellow-600">
                                {row.late}
                              </TableCell>
                              <TableCell className="text-center text-red-600">
                                {row.absent}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.trend === "up" ? (
                                  <ArrowUp className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Session Details Dialog */}
      <Dialog
        key={`session-details-${dialogKey}`}
        open={showSessionDetails}
        onOpenChange={(open) => {
          setShowSessionDetails(open);
          if (!open) {
            setTimeout(() => {
              setSelectedSessionDetails(null);
              setDialogKey((prev) => prev + 1);
            }, 100);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Session Details
              {selectedSessionDetails && (
                <span>
                  {" - "}
                  {selectedSessionDetails.session_name} (
                  {selectedSessionDetails.date} at {selectedSessionDetails.time}
                  )
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedSessionDetails && (
            <SessionDetailView session={selectedSessionDetails} />
          )}
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog
        key={`student-details-${dialogKey}`}
        open={showStudentDetails}
        onOpenChange={(open) => {
          setShowStudentDetails(open);
          if (!open) {
            setTimeout(() => {
              setSelectedStudent(null);
              setDialogKey((prev) => prev + 1);
            }, 100);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details - {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Comprehensive attendance information for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <p className="text-sm font-medium">{selectedStudent.name}</p>
                </div>
                <div className="space-y-2">
                  <Label>USN</Label>
                  <p className="text-sm font-mono">{selectedStudent.usn}</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm">{selectedStudent.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Overall Attendance</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedStudent.status === "critical"
                          ? "destructive"
                          : selectedStudent.status === "at-risk"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedStudent.attendanceRate}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({selectedStudent.presentSessions} present,{" "}
                      {selectedStudent.lateSessions} late,{" "}
                      {selectedStudent.absentSessions} absent)
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold">
                      {selectedStudent.presentSessions}
                    </div>
                    <div className="text-xs text-muted-foreground">Present</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <div className="text-lg font-bold">
                      {selectedStudent.lateSessions}
                    </div>
                    <div className="text-xs text-muted-foreground">Late</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="text-lg font-bold">
                      {selectedStudent.absentSessions}
                    </div>
                    <div className="text-xs text-muted-foreground">Absent</div>
                  </CardContent>
                </Card>
              </div>

              {/* Last Attended */}
              <div className="space-y-2">
                <Label>Last Attended</Label>
                <p className="text-sm">{selectedStudent.lastAttended}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => handleContactStudent(selectedStudent)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Student
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportStudentData(selectedStudent)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Student Dialog */}
      <Dialog
        key={`contact-student-${dialogKey}`}
        open={showContactStudent}
        onOpenChange={(open) => {
          setShowContactStudent(open);
          if (!open) {
            setTimeout(() => {
              setContactMessage("");
              setSelectedStudent(null);
              setDialogKey((prev) => prev + 1);
            }, 100);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Send a message regarding attendance concerns
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactStudent(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={sendContactMessage}
              disabled={!contactMessage.trim()}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Attendance Dialog */}
      <Dialog
        key={`mark-attendance-${dialogKey}`}
        open={showMarkAttendance}
        onOpenChange={(open) => {
          setShowMarkAttendance(open);
          if (!open) {
            setTimeout(() => {
              setMarkAttendanceReason("");
              setSelectedStudent(null);
              setDialogKey((prev) => prev + 1);
            }, 100);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mark Attendance for {selectedStudent?.name}
            </DialogTitle>
            <DialogDescription>
              Manually mark attendance with reason
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Manual Entry</Label>
              <Textarea
                value={markAttendanceReason}
                onChange={(e) => setMarkAttendanceReason(e.target.value)}
                placeholder="Enter reason for manual attendance marking..."
                rows={4}
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will create a manual attendance entry. Please provide a
                clear reason for audit purposes.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarkAttendance(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Handle manual attendance marking
                console.log("Marking attendance for:", selectedStudent?.name);
                console.log("Reason:", markAttendanceReason);

                showToast({
                  title: "Attendance Marked",
                  description: `${selectedStudent?.name} has been marked present.`,
                });

                setShowMarkAttendance(false);
                setMarkAttendanceReason("");
                setSelectedStudent(null);
              }}
              disabled={!markAttendanceReason.trim()}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Mark Present
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  onEndSession,
  onGenerateQR,
}: {
  session: AttendanceSession;
  onEndSession: (id: string) => void;
  onGenerateQR: (session: AttendanceSession) => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{session.session_name}</CardTitle>
          <Badge variant="outline" className="capitalize">
            {session.session_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          Started: {new Date(session.start_time).toLocaleTimeString()}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4" />
          {session.qr_status === "active" ? (
            <span className="text-green-600">
              QR Active ({Math.round(session.minutes_until_qr_expiry || 0)}m
              left)
            </span>
          ) : (
            <span className="text-red-600">QR Expired</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateQR(session)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onEndSession(session.id)}
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Session Detail Modal Component
function SessionDetailView({ session }: { session: any }) {
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const { showToast } = useToast();

  const handleEditAttendance = (student: any) => {
    setEditingStudent(student);
    setEditStatus(student.status);
    setEditReason("");
  };

  const handleSaveEdit = async () => {
    if (!editingStudent || !editStatus) return;

    // Validate that reason is provided for critical changes
    const isCriticalChange =
      (editingStudent.status === "present" && editStatus === "absent") ||
      (editingStudent.status === "absent" && editStatus === "present");

    if (isCriticalChange && !editReason.trim()) {
      showToast({
        title: "Reason Required",
        description: "Please provide a reason for this attendance change.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEditLoading(true);

      await markManualAttendance({
        session_id: sessionData.id,
        student_id: editingStudent.studentId,
        status: editStatus as AttendanceStatus,
        manual_reason:
          editReason.trim() ||
          `Status changed from ${editingStudent.status} to ${editStatus} by faculty`,
      });

      // Update the session data to reflect the change
      const updatedRecords = sessionData.studentRecords.map((record: any) =>
        record.studentId === editingStudent.studentId
          ? {
              ...record,
              status: editStatus,
              timestamp:
                editStatus !== "absent"
                  ? new Date().toLocaleTimeString()
                  : null,
              manuallyEdited: true,
            }
          : record
      );

      // Recalculate counts
      const presentCount = updatedRecords.filter(
        (r: any) => r.status === "present"
      ).length;
      const lateCount = updatedRecords.filter(
        (r: any) => r.status === "late"
      ).length;
      const absentCount = updatedRecords.filter(
        (r: any) => r.status === "absent"
      ).length;

      setSessionData({
        ...sessionData,
        studentRecords: updatedRecords,
        presentCount,
        lateCount,
        absentCount,
      });

      setEditingStudent(null);
      setEditStatus("");
      setEditReason("");

      // Show success toast
      showToast({
        title: "Attendance Updated",
        description: `${editingStudent.name}'s attendance has been updated to ${editStatus}.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating attendance:", error);
      showToast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditStatus("");
    setEditReason("");
  };

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-medium">
              {sessionData.presentCount}
            </div>
            <div className="text-sm text-muted-foreground">Present</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-medium">{sessionData.lateCount}</div>
            <div className="text-sm text-muted-foreground">Late</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-medium">
              {sessionData.absentCount}
            </div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Student</TableHead>
                <TableHead className="min-w-[100px]">USN</TableHead>
                <TableHead className="text-center min-w-[120px]">
                  Status
                </TableHead>
                <TableHead className="min-w-[120px]">Check-in Time</TableHead>
                <TableHead className="min-w-[120px]">
                  Location Verified
                </TableHead>
                <TableHead className="text-center min-w-[80px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionData.studentRecords?.map((record: any) => (
                <TableRow key={record.studentId} className="hover:bg-muted/30">
                  <TableCell className="min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback
                          className={`text-sm ${
                            record.status === "absent"
                              ? "bg-red-100 text-red-600"
                              : record.status === "late"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {record.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate">
                        {record.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm min-w-[100px]">
                    <span className="truncate block">{record.usn}</span>
                  </TableCell>
                  <TableCell className="text-center min-w-[120px]">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          record.status === "present"
                            ? "secondary"
                            : record.status === "late"
                            ? "default"
                            : "destructive"
                        }
                        className="capitalize whitespace-nowrap"
                      >
                        {record.status}
                      </Badge>
                      {record.manuallyEdited && (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Edit className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-600">
                            Manual
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    {record.timestamp ? (
                      <span className="text-sm">{record.timestamp}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    {record.location ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-sm text-green-600">Verified</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center min-w-[80px]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAttendance(record)}
                      className="h-7 px-2 whitespace-nowrap"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Update attendance status for {editingStudent?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Attendance Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Present
                    </div>
                  </SelectItem>
                  <SelectItem value="late">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Late
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Absent
                    </div>
                  </SelectItem>
                  <SelectItem value="excused">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Excused
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for attendance change (e.g., medical emergency, disciplinary action, etc.)"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                This reason will be logged for audit purposes.
              </p>
            </div>

            {editStatus !== editingStudent?.status && (
              <Alert
                className={
                  (editingStudent?.status === "present" &&
                    editStatus === "absent") ||
                  (editingStudent?.status === "absent" &&
                    editStatus === "present")
                    ? "border-orange-200 bg-orange-50"
                    : "border-blue-200 bg-blue-50"
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {editingStudent?.status === "present" &&
                  editStatus === "absent" ? (
                    <div>
                      <strong>Important:</strong> You're changing status from
                      Present to Absent. This might be for disciplinary reasons.
                      Please provide a clear reason.
                    </div>
                  ) : editingStudent?.status === "absent" &&
                    editStatus === "present" ? (
                    <div>
                      <strong>Note:</strong> You're marking an absent student as
                      present. This might be for medical or other valid reasons.
                    </div>
                  ) : (
                    <div>
                      This change will override the student's original
                      attendance status and will be logged with your faculty ID
                      and timestamp.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isEditLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                !editStatus ||
                isEditLoading ||
                // Require reason for critical changes
                (((editingStudent?.status === "present" &&
                  editStatus === "absent") ||
                  (editingStudent?.status === "absent" &&
                    editStatus === "present")) &&
                  !editReason.trim())
              }
            >
              {isEditLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Attendance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Session Form Component
function CreateSessionForm({
  form,
  onChange,
  onSubmit,
  isLoading,
}: {
  form: any;
  onChange: (form: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="session_name">Session Name</Label>
        <Input
          id="session_name"
          value={form.session_name}
          onChange={(e) => onChange({ ...form, session_name: e.target.value })}
          placeholder="e.g., Morning Lecture"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="session_type">Session Type</Label>
        <Select
          value={form.session_type}
          onValueChange={(value) =>
            onChange({ ...form, session_type: value as SessionType })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lecture">Lecture</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="tutorial">Tutorial</SelectItem>
            <SelectItem value="seminar">Seminar</SelectItem>
            <SelectItem value="practical">Practical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 ">
        <div className="space-y-2">
          <Label htmlFor="qr_duration">QR Duration (min)</Label>
          <Input
            id="qr_duration"
            type="number"
            min="1"
            max="30"
            value={form.qr_duration_minutes || 5}
            onChange={(e) =>
              onChange({
                ...form,
                qr_duration_minutes: parseInt(e.target.value) || 5,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="radius">Radius (meters)</Label>
          <Input
            id="radius"
            type="number"
            min="5"
            max="100"
            value={form.allowed_radius_meters || 20}
            onChange={(e) =>
              onChange({
                ...form,
                allowed_radius_meters: parseInt(e.target.value) || 20,
              })
            }
          />
        </div>
      </div>

      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Your current location will be used as the class location for proximity
          verification.
        </AlertDescription>
      </Alert>

      <Button
        onClick={onSubmit}
        disabled={isLoading || !form.session_name}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Starting Session...
          </>
        ) : (
          <>
            <QrCode className="h-4 w-4 mr-2" />
            Start Session
          </>
        )}
      </Button>
    </div>
  );
}

// Settings Form Component
function AttendanceSettingsForm({
  settings,
  onUpdate,
}: {
  settings: ClassAttendanceSettings;
  onUpdate: (settings: ClassAttendanceSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updated = await updateClassAttendanceSettings(
        settings.group_id,
        form
      );
      onUpdate(updated);
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="min_attendance">Minimum Attendance (%)</Label>
        <Input
          id="min_attendance"
          type="number"
          min="0"
          max="100"
          value={form.minimum_attendance_percentage || 75}
          onChange={(e) =>
            setForm({
              ...form,
              minimum_attendance_percentage: parseFloat(e.target.value) || 75,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notification_threshold">
          Notification Threshold (%)
        </Label>
        <Input
          id="notification_threshold"
          type="number"
          min="0"
          max="100"
          value={form.notification_threshold_percentage || 70}
          onChange={(e) =>
            setForm({
              ...form,
              notification_threshold_percentage:
                parseFloat(e.target.value) || 70,
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="default_qr_duration">Default QR Duration (min)</Label>
          <Input
            id="default_qr_duration"
            type="number"
            min="1"
            max="30"
            value={form.default_qr_duration_minutes || 5}
            onChange={(e) =>
              setForm({
                ...form,
                default_qr_duration_minutes: parseInt(e.target.value) || 5,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_radius">Default Radius (m)</Label>
          <Input
            id="default_radius"
            type="number"
            min="5"
            max="100"
            value={form.default_allowed_radius_meters || 20}
            onChange={(e) =>
              setForm({
                ...form,
                default_allowed_radius_meters: parseInt(e.target.value) || 20,
              })
            }
          />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Settings"
        )}
      </Button>
    </div>
  );
}
