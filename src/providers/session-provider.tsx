"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function SessionProvider() {
  const { setUser, setRole, setLoading } = useUserStore();

  useEffect(() => {
    // Initialize session on mount
    const initializeSession = async () => {
      setLoading(true);
      console.log("🔄 Initializing session...");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("📝 Session data:", session);
        if (session?.user) {
          const role = session.user.user_metadata?.role || "student";
          console.log(
            "✅ User authenticated:",
            session.user.email,
            "Role:",
            role
          );
          setUser(session.user);
          setRole(role);
        } else {
          console.log("❌ No user session found");
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("❌ Error initializing session:", error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
        console.log("✅ Session initialization complete");
      }
    };

    initializeSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "student";
        setUser(session.user);
        setRole(role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setRole, setLoading]);

  return null;
}
