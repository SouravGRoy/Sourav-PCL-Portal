/**
 * Test assignments API integration
 * Run this in the browser console to test assignment fetching
 */

async function testAssignmentFetching() {
  try {
    console.log("=== Testing Assignment Fetching ===");

    // Check authentication
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) {
      console.error("User not authenticated");
      return;
    }
    console.log("✓ User authenticated:", authUser.user.email);

    // Get available groups
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .limit(3);

    if (groupsError) {
      console.error("Error fetching groups:", groupsError);
      return;
    }

    console.log(
      "✓ Available groups:",
      groups.map((g) => ({ id: g.id, name: g.name }))
    );

    // Test assignment fetching for each group
    for (const group of groups.slice(0, 2)) {
      console.log(`\n--- Testing group: ${group.name} (${group.id}) ---`);

      const { data: assignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select(
          `
          *,
          assignment_rubrics (
            id,
            criteria_name,
            criteria_description,
            max_points,
            order_index
          )
        `
        )
        .eq("group_id", group.id)
        .order("created_at", { ascending: false });

      if (assignmentsError) {
        console.error(
          `Error fetching assignments for group ${group.name}:`,
          assignmentsError
        );
        continue;
      }

      console.log(
        `✓ Found ${assignments.length} assignments for group ${group.name}:`
      );
      assignments.forEach((assignment) => {
        console.log(
          `  - ${assignment.title} (${assignment.status}) - Due: ${new Date(
            assignment.due_date
          ).toLocaleDateString()}`
        );
        if (assignment.assignment_rubrics?.length > 0) {
          console.log(
            `    Rubric criteria: ${assignment.assignment_rubrics.length} items`
          );
        }
      });
    }

    console.log("\n=== Assignment fetching test complete ===");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Also test the API function directly
async function testAPIFunction() {
  try {
    // First get a group ID
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name")
      .limit(1);
    if (!groups || groups.length === 0) {
      console.error("No groups found for API test");
      return;
    }

    const groupId = groups[0].id;
    console.log(
      `Testing getGroupAssignments API function with group: ${groups[0].name} (${groupId})`
    );

    // This would test the actual API function (uncomment in your app):
    // const assignments = await getGroupAssignments(groupId);
    // console.log('API function result:', assignments);

    console.log(
      "API function test prepared - run getGroupAssignments() in your app"
    );
  } catch (error) {
    console.error("API function test failed:", error);
  }
}

// Run the tests
console.log("🚀 Starting assignment integration tests...");
testAssignmentFetching();
testAPIFunction();
