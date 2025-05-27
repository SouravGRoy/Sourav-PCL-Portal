"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function SessionProvider() {
  const { setUser, setRole } = useUserStore();

  useEffect(() => {
    // Initialize session on mount
    const initializeSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role || "student";
        setUser(session.user);
        setRole(role);
      } else {
        setUser(null);
        setRole(null);
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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setRole]);

  return null;
}
