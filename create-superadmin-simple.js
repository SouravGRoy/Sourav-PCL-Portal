// A simplified script to create a superadmin account
// First, make sure to install the required package:
// npm install @supabase/supabase-js

const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual values from the Supabase dashboard
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Not the anon key!

// Create a Supabase client with the service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createSuperAdmin() {
  try {
    console.log('Creating superadmin account...');
    
    // 1. Create the user with the Auth API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'superadmin@jainuniversity.ac.in',
      password: 'Imshade45',
      email_confirm: true, // Auto-confirm the email
      user_metadata: { role: 'superadmin' }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return;
    }

    console.log('User created successfully with ID:', userData.user.id);

    // 2. Create the profile record
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        email: 'superadmin@jainuniversity.ac.in',
        role: 'superadmin'
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
