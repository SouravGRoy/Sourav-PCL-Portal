// src/app/auth/error/page.tsx
"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import AuthErrorDisplay from "./auth-error-display";

function AuthErrorFallback() {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-red-600">Authentication Error</CardTitle>
        <CardDescription>Loading error details...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-sm text-red-700">
            Please wait while we load the error details.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" disabled>
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </CardFooter>
    </>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Academic Portal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            University Academic Management System
          </p>
        </div>
        <Card>
          <Suspense fallback={<AuthErrorFallback />}>
            <AuthErrorDisplay />
          </Suspense>
          {/* Optional: Add a generic footer outside the Suspense boundary if needed */}
          {/* <CardFooter className="flex justify-center pt-4">
            <p className="text-xs text-gray-500">
              If problems persist, contact support at support@jainuniversity.ac.in
            </p>
          </CardFooter> */}
        </Card>
      </div>
    </div>
  );
}
