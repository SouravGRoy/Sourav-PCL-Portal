"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  QrCode,
  Navigation,
  Loader2,
  ArrowLeft,
  Camera,
} from "lucide-react";
import { processQRScan, canMarkAttendance } from "@/lib/api/attendance";
import { useUserStore } from "@/lib/store";
import { AttendanceRecord } from "@/types";
import QRScanner from "@/components/attendance/qr-scanner";
import Link from "next/link";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function AttendanceScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserStore();

  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [attendanceResult, setAttendanceResult] =
    useState<AttendanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canMark, setCanMark] = useState<boolean>(false);
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [showScanner, setShowScanner] = useState(false);
  const [scannedToken, setScannedToken] = useState<string | null>(null);

  // Get token from URL or scanned QR
  const urlToken = searchParams.get("token");
  const qrToken = scannedToken || urlToken;

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // If no token in URL, show scanner
    if (!urlToken) {
      setShowScanner(true);
    }

    if (qrToken) {
      checkAttendanceEligibility();
      getCurrentLocation();
    }
  }, [user, qrToken]);

  const handleQRScanSuccess = (scannedCode: string) => {
    console.log("QR Code scanned:", scannedCode);

    // Extract token from scanned code if it's a URL
    let token = scannedCode;
    try {
      const url = new URL(scannedCode);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        token = tokenParam;
        console.log("Extracted token from URL:", token);
      } else {
        console.log("No token parameter found in URL, using full URL as token");
      }
    } catch {
      // If not a URL, use the scanned code directly as token
      console.log("Not a URL, using scanned code directly as token:", token);
    }

    console.log("Final token to be used:", token);
    setScannedToken(token);
    setShowScanner(false);
    setError(null);
  };

  const checkAttendanceEligibility = async () => {
    if (!qrToken || !user) return;

    try {
      setCanMark(true);
    } catch (error) {
      console.error("Error checking eligibility:", error);
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setLocationLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = "Failed to get location: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out";
            break;
          default:
            errorMessage += "Unknown error occurred";
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  };

  const handleMarkAttendance = async () => {
    if (!qrToken || !location || !user) return;

    console.log("Attempting to mark attendance with:", {
      qrToken,
      location,
      userId: user.id,
    });

    setIsLoading(true);
    setError(null);

    try {
      const result = await processQRScan({
        qr_code_token: qrToken,
        student_latitude: location.latitude,
        student_longitude: location.longitude,
      });

      console.log("Attendance marked successfully:", result);
      setAttendanceResult(result);
    } catch (error: any) {
      console.error("Failed to mark attendance:", error);
      setError(error.message || "Failed to mark attendance");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-4">
                Please log in to mark attendance
              </p>
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show QR Scanner when no token is provided
  if (showScanner || (!qrToken && !scannedToken)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onError={(error) => setError(error)}
            isActive={true}
          />

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="text-center text-sm text-gray-600">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium mb-1">Scan Attendance QR Code</p>
                <p>
                  Point your camera at the QR code displayed by your instructor
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (attendanceResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-green-600">
              Attendance Marked Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Session:</span>
                <span>{attendanceResult.session_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Type:</span>
                <Badge variant="outline" className="capitalize">
                  {attendanceResult.session_type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <Badge
                  variant={
                    attendanceResult.status === "present"
                      ? "default"
                      : "secondary"
                  }
                  className={
                    attendanceResult.status === "present"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  }
                >
                  {attendanceResult.status === "present" ? "Present" : "Late"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>
                  {new Date(
                    attendanceResult.check_in_time
                  ).toLocaleTimeString()}
                </span>
              </div>
              {attendanceResult.distance_from_faculty_meters && (
                <div className="flex justify-between">
                  <span className="font-medium">Distance:</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(attendanceResult.distance_from_faculty_meters)}m
                    from faculty
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <QrCode className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Mark Attendance</CardTitle>
          <p className="text-sm text-gray-600">
            Verify your location and mark your attendance
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              <span className="font-medium">Location Verification</span>
            </div>

            {locationLoading && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Getting your location...</span>
              </div>
            )}

            {locationError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {locationError}
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-2"
                    onClick={getCurrentLocation}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {location && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Location acquired</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Accuracy: ±{Math.round(location.accuracy)}m</div>
                  <div className="text-xs text-gray-500">
                    Your location will be verified against the class location
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Existing Record Warning */}
          {existingRecord && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You have already marked attendance for this session as{" "}
                <Badge variant="outline" className="ml-1">
                  {existingRecord.status}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleMarkAttendance}
              disabled={!location || isLoading || !!existingRecord}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Attendance
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowScanner(true)}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR Code
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Make sure you are within the allowed radius of your class</p>
            <p>Your location is used only for attendance verification</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
