"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Users, Clock } from "lucide-react";
import {
  createTestAttendanceSession,
  generateQRCodeURL,
} from "@/lib/api/attendance";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/lib/store";
import QRCodeLib from "qrcode";

interface Group {
  id: string;
  name: string;
  code: string;
}

export default function TestAttendancePage() {
  const { user } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [testSession, setTestSession] = useState<{
    qrToken: string;
    sessionId: string;
  } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data: groups, error } = await supabase
        .from("groups")
        .select("id, name, code")
        .limit(10);

      if (error) throw error;
      setGroups(groups || []);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setError("Failed to fetch groups");
    }
  };

  const createTestSession = async (groupId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Creating test session for group:", groupId);
      const session = await createTestAttendanceSession(groupId);
      setTestSession(session);

      // Generate QR code URL
      const qrUrl = generateQRCodeURL(session.qrToken);
      console.log("Generated QR URL:", qrUrl);

      // Generate QR code image
      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(qrCodeDataUrl);

      console.log("Test session created successfully:", session);
    } catch (err: any) {
      console.error("Error creating test session:", err);
      setError(err.message || "Failed to create test session");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Please log in to create test attendance sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Test Attendance Session Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">Available Groups:</h3>
            <div className="grid gap-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{group.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Code: {group.code}
                    </div>
                  </div>
                  <Button
                    onClick={() => createTestSession(group.id)}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {testSession && (
            <div className="space-y-4 p-4 border rounded-lg bg-green-50">
              <h3 className="font-medium text-green-800">
                ✅ Test Session Created!
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <strong>Session ID:</strong> {testSession.sessionId}
                </div>
                <div>
                  <strong>QR Token:</strong>{" "}
                  {testSession.qrToken.substring(0, 16)}...
                </div>
              </div>

              {qrCodeUrl && (
                <div className="text-center">
                  <h4 className="font-medium mb-2">Scan this QR Code:</h4>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This QR code contains the attendance URL
                  </p>
                </div>
              )}

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  This test session will expire in 30 minutes. Students can now
                  scan the QR code to mark attendance.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
