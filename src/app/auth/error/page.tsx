"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Friendly error messages for common errors
  const getErrorMessage = () => {
    if (error === "otp_expired") {
      return "The verification link has expired. Please request a new verification link.";
    }
    if (error === "exchange_failed") {
      return "Failed to verify your email. Please try again.";
    }
    return errorDescription || "An error occurred during authentication.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Academic Portal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Jain University Academic Management System
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>
              We encountered a problem with your authentication
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
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">Return to Login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/register">Create New Account</Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Need help? Contact support at support@jainuniversity.ac.in
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
