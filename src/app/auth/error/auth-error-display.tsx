"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AuthErrorDisplay() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const getErrorMessage = () => {
    if (error === "otp_expired") {
      return "The verification link has expired. Please request a new verification link.";
    }
    if (error === "exchange_failed") {
      return "Failed to verify your email. Please try again.";
    }
    // Add more specific messages for other common errors if known
    return errorDescription || "An unexpected error occurred during authentication. Please try again or contact support if the issue persists.";
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-red-600">Authentication Error</CardTitle>
        <CardDescription>
          We encountered a problem with your authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-sm text-red-700">{getErrorMessage()}</p>
        </div>
        <div className="mt-4 space-y-4">
          {error === "otp_expired" && (
            <Button asChild className="w-full">
              <Link href="/auth/forgot-password">Request New Link</Link>
            </Button>
          )}
          {/* Example: Add a generic retry or contact support button for other errors */}
          {/* 
          {error !== "otp_expired" && (
            <Button asChild className="w-full" variant="outline">
              <Link href="/contact-support">Contact Support</Link>
            </Button>
          )}
          */}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </CardFooter>
    </>
  );
}
