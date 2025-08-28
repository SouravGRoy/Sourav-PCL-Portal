/**
 * Test script to debug assignment creation issues
 * Run this in the browser console to test the assignment creation flow
 */

// Test assignment creation with minimal data
async function testAssignmentCreation(groupId = null) {
  try {
    console.log("Testing assignment creation...");

    // First check if user is authenticated
    const { data: authUser } = await supabase.auth.getUser();
    console.log("Current user:", authUser);

    if (!authUser.user) {
      console.error("User not authenticated");
      return;
    }

    // Use provided group ID or get first available group
    let testGroupId = groupId;
    if (!testGroupId) {
      const groups = await testGroupRetrieval();
      if (!groups || groups.length === 0) {
        console.error("No groups available for testing");
        return;
      }
      testGroupId = groups[0].id;
      console.log("Using group ID:", testGroupId);
    }

    // Test minimal assignment data
    const testAssignment = {
      group_id: testGroupId,
      title: "Test Assignment",
      description: "Test description",
      type: "individual",
      max_score: 100,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      allow_late_submission: false,
      late_submission_penalty: 0,
      enable_peer_review: false,
    };

    console.log("Testing with data:", testAssignment);

    // Test database insertion directly
    const { data: insertResult, error: insertError } = await supabase
      .from("assignments")
      .insert({
        ...testAssignment,
        created_by: authUser.user.id,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insertion error:", insertError);
      return;
    }

    console.log("Assignment created successfully:", insertResult);

    // Clean up test data
    await supabase.from("assignments").delete().eq("id", insertResult.id);
    console.log("Test assignment cleaned up");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Test group retrieval
async function testGroupRetrieval() {
  try {
    const { data: groups, error } = await supabase
      .from("groups")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Error fetching groups:", error);
      return;
    }

    console.log("Available groups:", groups);
    return groups;
  } catch (error) {
    console.error("Group retrieval test failed:", error);
  }
}

// Test using the actual API function
async function testAPIAssignmentCreation(groupId = null) {
  try {
    console.log("Testing API assignment creation...");

    // Get group ID if not provided
    let testGroupId = groupId;
    if (!testGroupId) {
      const groups = await testGroupRetrieval();
      if (!groups || groups.length === 0) {
        console.error("No groups available for testing");
        return;
      }
      testGroupId = groups[0].id;
    }

    // Test data for API
    const apiTestData = {
      group_id: testGroupId,
      title: "API Test Assignment",
      description: "Testing via API",
      type: "individual",
      max_score: 100,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      allow_late_submission: false,
      late_submission_penalty: 0,
      enable_peer_review: false,
      rubric_criteria: [
        {
          criteria_name: "Quality",
          criteria_description: "Code quality",
          max_points: 50,
        },
        {
          criteria_name: "Functionality",
          criteria_description: "Works correctly",
          max_points: 50,
        },
      ],
    };

    console.log("Testing API with data:", apiTestData);

    // This would use your createAssignment API function
    // Uncomment if you want to test it in the actual app:
    // const result = await createAssignment(apiTestData);
    // console.log("API Assignment created:", result);

    console.log(
      "API test data prepared. Run this in your app to test the actual API."
    );
  } catch (error) {
    console.error("API test failed:", error);
  }
}

// Run tests
console.log("=== Assignment Creation Debug Tests ===");
testGroupRetrieval().then((groups) => {
  if (groups && groups.length > 0) {
    // Update the test with a real group ID
    console.log("Available groups:", groups);
    console.log("To test direct DB insertion: testAssignmentCreation()");
    console.log("To test API function: testAPIAssignmentCreation()");
  }
});
