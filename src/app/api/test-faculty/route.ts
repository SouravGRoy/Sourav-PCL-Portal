import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  try {
    console.log('TEST API: Starting test');
    console.log('TEST API: Supabase URL available:', !!supabaseUrl);
    console.log('TEST API: Supabase Service Role Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase credentials',
        url_available: !!supabaseUrl,
        key_available: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Your user ID from the request
    const userId = '505d72f6-f2ec-4a4b-a5df-3644b1ac0328';
    
    // 1. Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('faculty_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('TEST API: Existing profile check result:', existingProfile);
    
    if (profileCheckError) {
      console.error('TEST API: Error checking profile:', profileCheckError);
      return NextResponse.json({
        error: 'Error checking profile',
        details: profileCheckError
      }, { status: 500 });
    }
    
    // 2. Direct insert/update test
    let result;
    const testName = 'Test Faculty Name ' + new Date().toISOString();
    const testDepartment = 'Test Department ' + new Date().toISOString();
    
    if (existingProfile) {
      // Update
      console.log('TEST API: Updating existing profile with ID:', existingProfile.id);
      const { data, error } = await supabase
        .from('faculty_profiles')
        .update({
          name: testName,
          department: testDepartment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      if (error) {
        console.error('TEST API: Update error:', error);
        return NextResponse.json({
          error: 'Update error',
          details: error
        }, { status: 500 });
      }
      
      result = data;
    } else {
      // Insert
      console.log('TEST API: Creating new profile');
      const { data, error } = await supabase
        .from('faculty_profiles')
        .insert({
          user_id: userId,
          name: testName,
          department: testDepartment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('TEST API: Insert error:', error);
        return NextResponse.json({
          error: 'Insert error',
          details: error
        }, { status: 500 });
      }
      
      result = data;
    }
    
    // 3. Verify the change
    const { data: verifyData, error: verifyError } = await supabase
      .from('faculty_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (verifyError) {
      console.error('TEST API: Verification error:', verifyError);
      return NextResponse.json({
        error: 'Verification error',
        details: verifyError
      }, { status: 500 });
    }
    
    // Success!
    return NextResponse.json({
      success: true,
      operation: existingProfile ? 'update' : 'insert',
      testName,
      testDepartment,
      result,
      verification: verifyData
    });
    
  } catch (error: any) {
    console.error('TEST API: Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
