import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('API: Supabase URL available:', !!supabaseUrl);
console.log('API: Supabase Service Role Key available:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('API: Missing Supabase URL or Service Role Key');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { userId, name, department } = requestData;
    
    console.log('API: Full request data received:', JSON.stringify(requestData, null, 2));
    console.log('API: Extracted profile data:', { 
      userId, 
      name: name, 
      nameType: typeof name,
      nameLength: name ? name.length : 0,
      department 
    });
    
    if (!userId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('API: Creating faculty profile with:', { userId, name, department });
    
    // Step 1: Check if the base profile exists
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('API: Error checking base profile:', profileError);
      return NextResponse.json(
        { error: `Failed to check base profile: ${profileError.message}` },
        { status: 500 }
      );
    }
    
    // Step 2: Create or update the base profile
    let baseProfile;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          name,
          role: 'faculty',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) {
        console.error('API: Error updating base profile:', error);
        return NextResponse.json(
          { error: `Failed to update base profile: ${error.message}` },
          { status: 500 }
        );
      }
      
      baseProfile = data;
    } else {
      // Create new profile
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: requestData.email || '',
          name,
          role: 'faculty',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('API: Error creating base profile:', error);
        return NextResponse.json(
          { error: `Failed to create base profile: ${error.message}` },
          { status: 500 }
        );
      }
      
      baseProfile = data;
    }
    
    console.log('API: Base profile created/updated successfully:', baseProfile);
    
    // Step 3: Check if faculty profile exists
    const { data: existingFacultyProfile, error: facultyProfileError } = await supabaseAdmin
      .from('faculty_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (facultyProfileError && facultyProfileError.code !== 'PGRST116') {
      console.error('API: Error checking faculty profile:', facultyProfileError);
      return NextResponse.json(
        { error: `Failed to check faculty profile: ${facultyProfileError.message}` },
        { status: 500 }
      );
    }
    
    // Step 4: Create or update faculty profile
    let facultyProfile;
    if (existingFacultyProfile) {
      // Update existing faculty profile
      const updatePayload = {
        name,
        department, // Remove default fallback - use actual input value
        updated_at: new Date().toISOString()
      };
      
      console.log('API: Update payload for faculty profile:', JSON.stringify(updatePayload, null, 2));
      
      const { data, error } = await supabaseAdmin
        .from('faculty_profiles')
        .update(updatePayload)
        .eq('id', existingFacultyProfile.id)
        .select()
        .single();
        
      if (error) {
        console.error('API: Error updating faculty profile:', error);
        return NextResponse.json(
          { error: `Failed to update faculty profile: ${error.message}` },
          { status: 500 }
        );
      }
      
      facultyProfile = data;
    } else {
      // Create new faculty profile
      const insertPayload = {
        user_id: userId,
        name, // Use actual name value
        department, // Use actual department value without default fallback
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('API: Insert payload for faculty profile:', JSON.stringify(insertPayload, null, 2));
      
      const { data, error } = await supabaseAdmin
        .from('faculty_profiles')
        .insert(insertPayload)
        .select()
        .single();
        
      if (error) {
        console.error('API: Error creating faculty profile:', error);
        return NextResponse.json(
          { error: `Failed to create faculty profile: ${error.message}` },
          { status: 500 }
        );
      }
      
      facultyProfile = data;
    }
    
    console.log('API: Faculty profile created/updated successfully:', facultyProfile);
    
    // Return the combined profile
    return NextResponse.json({
      success: true,
      profile: {
        ...baseProfile,
        ...facultyProfile
      }
    });
  } catch (error: any) {
    console.error('API: Unexpected error in faculty profile creation:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
}
