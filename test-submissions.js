// Simple test script to check submissions query
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmissionsQuery() {
  try {
    console.log("Testing assignments query...");

    // First, let's see what assignments exist
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title")
      .limit(5);

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError);
      return;
    }

    console.log("Found assignments:", assignments);

    if (assignments && assignments.length > 0) {
      const assignmentId = assignments[0].id;
      console.log(`Testing submissions for assignment: ${assignmentId}`);

      // Test the submissions query
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select(
          `
          *,
          profiles!student_id (
            id,
            email,
            role,
            student_profiles!user_id (
              name,
              usn,
              class
            )
          )
        `
        )
        .eq("assignment_id", assignmentId);

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        console.log("Submissions found:", data);
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

testSubmissionsQuery();
