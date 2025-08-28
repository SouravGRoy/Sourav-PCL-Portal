"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, RotateCcw, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onError: (error: string) => void;
  isActive?: boolean;
}

export default function QRScanner({
  onScanSuccess,
  onError,
  isActive = true,
}: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationStep, setInitializationStep] =
    useState<string>("Loading library...");

  // Initialize HTML5 QR Code scanner
  useEffect(() => {
    let mounted = true;

    const initializeScanner = async () => {
      try {
        setInitializationStep("Loading QR scanner library...");

        // Dynamically import html5-qrcode
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!mounted) return;

        setInitializationStep("Getting camera permissions...");

        // Get available cameras
        try {
          const devices = await Html5Qrcode.getCameras();
          console.log("Available cameras:", devices);

          if (devices && devices.length > 0) {
            setCameras(devices);
            // Prefer back camera (environment) if available
            const backCamera =
              devices.find(
                (device) =>
                  device.label.toLowerCase().includes("back") ||
                  device.label.toLowerCase().includes("environment")
              ) || devices[0];

            console.log("Selected camera:", backCamera);
            setCurrentCameraId(backCamera.id);
            setHasPermission(true);
          } else {
            setError("No cameras found on this device");
            setHasPermission(false);
            return;
          }
        } catch (err: any) {
          console.error("Error getting cameras:", err);
          setError("Camera access denied. Please allow camera permissions.");
          setHasPermission(false);
          return;
        }

        setInitializationStep("Initializing scanner...");

        // Wait for DOM element to be available
        let retries = 0;
        const waitForElement = () => {
          const element = document.getElementById("qr-scanner");
          if (element) {
            console.log("DOM element found, creating scanner");
            html5QrCodeRef.current = new Html5Qrcode("qr-scanner");
            setIsInitialized(true);
            setInitializationStep("Ready!");

            // Auto-start if active
            if (isActive) {
              setTimeout(startScanning, 500);
            }
          } else if (retries < 50) {
            // Max 5 seconds
            retries++;
            console.log(`Waiting for DOM element, retry ${retries}`);
            setTimeout(waitForElement, 100);
          } else {
            setError("Failed to find scanner container");
          }
        };

        waitForElement();
      } catch (err: any) {
        console.error("Failed to initialize scanner:", err);
        setError(`Failed to initialize scanner: ${err.message}`);
        onError("Failed to initialize scanner");
      }
    };

    // Start initialization after component mounts
    setTimeout(initializeScanner, 200);

    return () => {
      mounted = false;
      if (html5QrCodeRef.current && isScanning) {
        try {
          html5QrCodeRef.current.stop();
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    };
  }, []);

  const startScanning = async () => {
    if (!html5QrCodeRef.current || !currentCameraId || isScanning) {
      console.log("Cannot start scanning:", {
        hasScanner: !!html5QrCodeRef.current,
        cameraId: currentCameraId,
        isScanning,
      });
      return;
    }

    try {
      setError(null);
      console.log("Starting camera with ID:", currentCameraId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        currentCameraId,
        config,
        (decodedText: string) => {
          console.log("QR Code scanned:", decodedText);
          // Stop scanning immediately to prevent multiple scans
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().catch(() => {});
            setIsScanning(false);
          }
          onScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // Silent - this fires for every frame without QR code
        }
      );

      setIsScanning(true);
      console.log("Camera started successfully");
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(`Failed to start camera: ${err.message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
        console.log("Camera stopped");
      } catch (err: any) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleManualInput = () => {
    const token = prompt("Enter QR code or token manually:");
    if (token && token.trim()) {
      onScanSuccess(token.trim());
    }
  };

  const retryInitialization = () => {
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Show loading/error states */}
        {(!isInitialized || hasPermission !== true) && (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{initializationStep}</p>
            {hasPermission === false && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Camera access required. Please allow camera permissions.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={retryInitialization} variant="outline">
              Retry
            </Button>
          </div>
        )}

        {/* Scanner container - always rendered */}
        <div className="relative">
          <div
            id="qr-scanner"
            ref={scannerRef}
            className="w-full border rounded-lg overflow-hidden"
            style={{ minHeight: "300px" }}
          />

          {/* Overlay when not ready or not scanning */}
          {(!isScanning || !isInitialized) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <Camera className="h-12 w-12 mx-auto mb-2" />
                <p>
                  {!isInitialized
                    ? "Initializing..."
                    : "Click 'Start Scanning' to begin"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls - show when initialized */}
        {isInitialized && hasPermission === true && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={toggleScanning}
                className="flex-1"
                variant={isScanning ? "destructive" : "default"}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Scanning
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanning
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={handleManualInput}
              variant="outline"
              className="w-full"
            >
              Enter Code Manually
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              {isScanning
                ? "Position the QR code within the scanning area"
                : "Click 'Start Scanning' to begin QR code detection"}
            </div>

            {cameras.length > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                Using:{" "}
                {cameras.find((c) => c.id === currentCameraId)?.label ||
                  "Unknown camera"}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
