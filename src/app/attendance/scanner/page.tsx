"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, QrCode } from "lucide-react";
import QRScanner from "@/components/attendance/qr-scanner";
import Link from "next/link";

export default function QRScannerPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleQRScanSuccess = (scannedCode: string) => {
    console.log("QR Code scanned:", scannedCode);

    // Extract token from scanned code if it's a URL
    let token = scannedCode;
    try {
      const url = new URL(scannedCode);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        token = tokenParam;
      }
    } catch {
      // If not a URL, use the scanned code directly as token
    }

    // Redirect to the attendance scan page with the token
    router.push(`/attendance/scan?token=${encodeURIComponent(token)}`);
  };

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
          onError={(error: string) => setError(error)}
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
              <p className="mt-2 text-xs">
                Once scanned, you&apos;ll be redirected to mark your attendance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
