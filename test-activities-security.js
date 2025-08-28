// Test script to verify the security fix for recent activities
// This script can be run in the browser console to test the fix

console.log("🔒 Testing Recent Activities Security Fix");

// Test 1: Faculty Dashboard Activities
async function testFacultyActivities() {
  console.log("📊 Testing Faculty Dashboard Activities...");

  try {
    const { getFacultyRecentActivities } = await import(
      "/src/lib/api/activities.ts"
    );

    // Get current user ID (replace with actual user ID)
    const currentUserId = "your-faculty-id-here";

    const activities = await getFacultyRecentActivities(currentUserId, 10);

    console.log("✅ Faculty Activities Retrieved:", activities.length);

    // Check if activities only belong to current faculty's groups
    activities.forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`, {
        type: activity.type,
        description: activity.description,
        groupName: activity.group_name,
        actor: activity.actor_name,
      });
    });

    return activities;
  } catch (error) {
    console.error("❌ Error testing faculty activities:", error);
  }
}

// Test 2: Group Activities
async function testGroupActivities(groupId) {
  console.log(`📋 Testing Group Activities for Group: ${groupId}...`);

  try {
    const { getGroupRecentActivities } = await import(
      "/src/lib/api/activities.ts"
    );

    const activities = await getGroupRecentActivities(groupId, 10);

    console.log("✅ Group Activities Retrieved:", activities.length);

    // Check if activities only belong to this specific group
    activities.forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`, {
        type: activity.type,
        description: activity.description,
        groupId: activity.group_id,
        expectedGroupId: groupId,
        isCorrectGroup: activity.group_id === groupId,
      });
    });

    return activities;
  } catch (error) {
    console.error("❌ Error testing group activities:", error);
  }
}

// Run tests
console.log("🚀 Starting security tests...");
testFacultyActivities();

// Uncomment and replace with actual group ID to test
// testGroupActivities("your-group-id-here");

export { testFacultyActivities, testGroupActivities };
