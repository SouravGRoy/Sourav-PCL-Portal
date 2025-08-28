// Test script to check attendance tables
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAttendanceDatabase() {
  try {
    console.log("🔍 Testing attendance database tables...\n");

    // Check if attendance_sessions table exists and has data
    console.log("📊 Checking attendance_sessions table...");
    const { data: sessions, error: sessionsError } = await supabase
      .from("attendance_sessions")
      .select("*")
      .limit(5);

    if (sessionsError) {
      console.error("❌ Error accessing attendance_sessions:", sessionsError);
    } else {
      console.log(`✅ Found ${sessions?.length || 0} attendance sessions`);
      if (sessions && sessions.length > 0) {
        console.log("📋 Sample session:", sessions[0]);
      }
    }

    // Check if attendance_records table exists and has data
    console.log("\n📊 Checking attendance_records table...");
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .limit(5);

    if (recordsError) {
      console.error("❌ Error accessing attendance_records:", recordsError);
    } else {
      console.log(`✅ Found ${records?.length || 0} attendance records`);
      if (records && records.length > 0) {
        console.log("📋 Sample record:", records[0]);
      }
    }

    // Check groups table
    console.log("\n📊 Checking groups table...");
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id, name, faculty_id")
      .limit(5);

    if (groupsError) {
      console.error("❌ Error accessing groups:", groupsError);
    } else {
      console.log(`✅ Found ${groups?.length || 0} groups`);
      if (groups && groups.length > 0) {
        console.log("📋 Sample group:", groups[0]);
      }
    }

    // Check profiles table
    console.log("\n📊 Checking profiles table...");
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .limit(5);

    if (profilesError) {
      console.error("❌ Error accessing profiles:", profilesError);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles`);
      if (profiles && profiles.length > 0) {
        console.log("📋 Sample profile:", profiles[0]);
      }
    }
  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

testAttendanceDatabase();
