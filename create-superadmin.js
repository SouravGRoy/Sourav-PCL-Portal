// Run this script with Node.js to create a superadmin account
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      acc[match[1]] = match[2].replace(/^['"](.+)['"]$/, '$1');
    }
    return acc;
  }, {});
  
  supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
} else {
  // Fallback to process.env
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key not provided');
  console.log('Please set the following environment variables in .env.local:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (not anon key)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin() {
  try {
    // Step 1: Create the user with the Auth API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'superadmin@jainuniversity.ac.in',
      password: 'Imshade45',
      email_confirm: true, // Auto-confirm the email
      user_metadata: { role: 'superadmin' }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return;
    }

    console.log('User created successfully:', authData.user.id);

    // Step 2: Create the profile record
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: 'superadmin@jainuniversity.ac.in',
        name: 'Super Administrator',
        role: 'superadmin',
        created_at: new Date(),
        updated_at: new Date()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('Profile created successfully');
    console.log('Superadmin account created with:');
    console.log('Email: superadmin@jainuniversity.ac.in');
    console.log('Password: Imshade45');
    console.log('Role: superadmin');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createSuperAdmin();
