const fs = require('fs');
const path = require('path');

// Paths to check
const paths = [
  './src/types/index.ts',
  './src/lib/api/profiles.ts',
  './src/lib/api/assignments.ts',
  './src/lib/api/groups.ts',
  './src/lib/api/submissions.ts',
  './src/lib/supabase.ts',
  './src/lib/store.ts',
  './supabase-schema.sql',
  './src/components/dashboard/student-dashboard.tsx'
];

// Check if all files exist
console.log('Checking if all fixed files exist...');
const missingFiles = paths.filter(p => !fs.existsSync(path.resolve(p)));
if (missingFiles.length > 0) {
  console.error('Missing files:', missingFiles);
} else {
  console.log('All files exist ✅');
}

// Check for type consistency
console.log('\nChecking for type consistency...');
const typesContent = fs.readFileSync(path.resolve('./src/types/index.ts'), 'utf8');

// Check if Profile interface exists and is correctly defined
if (typesContent.includes('export interface Profile')) {
  console.log('Profile interface exists ✅');
} else {
  console.error('Profile interface is missing ❌');
}

// Check if StudentProfile extends Profile
if (typesContent.includes('export interface StudentProfile extends Profile')) {
  console.log('StudentProfile extends Profile ✅');
} else {
  console.error('StudentProfile does not extend Profile correctly ❌');
}

// Check if FacultyProfile extends Profile
if (typesContent.includes('export interface FacultyProfile extends Profile')) {
  console.log('FacultyProfile extends Profile ✅');
} else {
  console.error('FacultyProfile does not extend Profile correctly ❌');
}

// Check Supabase schema
console.log('\nChecking Supabase schema...');
const schemaContent = fs.readFileSync(path.resolve('./supabase-schema.sql'), 'utf8');

// Check if profiles table has name column
if (schemaContent.includes('name TEXT')) {
  console.log('Profiles table has name column ✅');
} else {
  console.error('Profiles table is missing name column ❌');
}

// Check if groups table has drive_link column
if (schemaContent.includes('drive_link TEXT')) {
  console.log('Groups table has drive_link column ✅');
} else {
  console.error('Groups table is missing drive_link column ❌');
}

// Check API implementations
console.log('\nChecking API implementations...');
const profilesApi = fs.readFileSync(path.resolve('./src/lib/api/profiles.ts'), 'utf8');
const assignmentsApi = fs.readFileSync(path.resolve('./src/lib/api/assignments.ts'), 'utf8');
const groupsApi = fs.readFileSync(path.resolve('./src/lib/api/groups.ts'), 'utf8');
const submissionsApi = fs.readFileSync(path.resolve('./src/lib/api/submissions.ts'), 'utf8');

// Check for try-catch blocks in API functions
const apiFiles = {
  'profiles.ts': profilesApi,
  'assignments.ts': assignmentsApi,
  'groups.ts': groupsApi,
  'submissions.ts': submissionsApi
};

for (const [file, content] of Object.entries(apiFiles)) {
  const tryCatchCount = (content.match(/try {/g) || []).length;
  console.log(`${file} has ${tryCatchCount} try-catch blocks for error handling`);
}

// Check Supabase client setup
console.log('\nChecking Supabase client setup...');
const supabaseClient = fs.readFileSync(path.resolve('./src/lib/supabase.ts'), 'utf8');

if (supabaseClient.includes('createServerClient')) {
  console.log('Server client function exists ✅');
} else {
  console.error('Server client function is missing ❌');
}

console.log('\nCheck completed. Please review any errors and fix them.');
