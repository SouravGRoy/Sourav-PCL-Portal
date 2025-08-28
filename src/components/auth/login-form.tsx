"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/lib/store";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const router = useRouter();
  const { setUser, setRole } = useUserStore();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const verified = searchParams.get("verified");
    if (verified === "true") {
      setVerificationSuccess(true);
    }
  }, []);

  const handleResendVerification = async () => {
    if (!email) {
      setError(
        "Please enter your email address to resend the verification email"
      );
      return;
    }

    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error resending verification email:", error);
        setError(`Failed to resend verification email: ${error.message}`);
      } else {
        setResendSuccess(true);
        setError(null);
      }
    } catch (err: any) {
      console.error("Unexpected error resending verification:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResendButton(false);
    setResendSuccess(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Authentication error:", error);
        if (error.message.includes("email not confirmed")) {
          setShowResendButton(true);
        }
        setError(error.message);
        return;
      }

      if (!data.user) {
        setError("No user data returned");
        return;
      }

      // Set user in the store
      setUser(data.user);

      // Check if profile exists and get the role
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError && userError.code !== "PGRST116") {
        console.error("Error checking user:", userError);
        setError("Failed to check user profile");
        return;
      }

      // Redirect based on profile existence
      if (!userData) {
        router.push("/profile/complete");
      } else {
        // Set the role from the profile data
        const userRole = userData.role;
        console.log("User role from profile:", userRole);
        setRole(userRole);

        // Store the role in localStorage for development purposes
        localStorage.setItem("userRole", userRole);
        localStorage.setItem("userEmail", email);

        // Redirect to the appropriate dashboard based on role
        if (userRole === "faculty") {
          router.push("/dashboard/faculty");
        } else if (userRole === "student") {
          router.push("/dashboard/student");
        } else if (userRole === "superadmin") {
          router.push("/dashboard/admin"); // Using admin route for superadmin
        } else {
          router.push("/dashboard");
        }

        console.log("Redirecting to dashboard for role:", userRole);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError("Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {verificationSuccess && (
          <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              <strong>Email verified successfully!</strong> You can now sign in
              with your credentials.
            </p>
          </div>
        )}

        <form
          className="space-y-6"
          onSubmit={handleSubmit}
          suppressHydrationWarning
        >
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="flex flex-col space-y-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {showResendButton && (
              <div className="mt-4">
                <p className="text-sm text-amber-600 mb-2">
                  Need a new verification email?
                </p>
                <button
                  type="button"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}

            {resendSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  Verification email sent! Please check your inbox and follow
                  the link to verify your email.
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Create a new account
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
