import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges that bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Check if we have the required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables for Supabase admin client');
}

export async function POST(request: Request) {
  try {
    const { userId, groupId, url, description } = await request.json();
    
    // Validate required fields
    if (!groupId || !userId || !url) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get the student profile ID for this user
    const { data: studentProfile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (profileError || !studentProfile) {
      console.error('Error finding student profile:', profileError);
      return NextResponse.json(
        { error: 'Could not find your student profile' },
        { status: 404 }
      );
    }
    
    // Use the student profile ID for student_id
    const studentId = studentProfile.id;
    
    // Count existing links
    const { data: existingLinks, error: countError } = await supabaseAdmin
      .from('student_drive_links')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', studentId);
      
    if (countError) {
      console.error('Error counting links:', countError);
      return NextResponse.json(
        { error: 'Failed to check existing links' },
        { status: 500 }
      );
    }
    
    if (existingLinks && existingLinks.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum number of drive links (5) reached' },
        { status: 400 }
      );
    }
    
    // Insert the link using admin privileges (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .insert({
        student_id: studentId,
        group_id: groupId,
        url,
        description: description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting link:', error);
      return NextResponse.json(
        { error: `Failed to insert drive link: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/drive-links:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const groupId = url.searchParams.get('groupId');
    
    if (!userId || !groupId) {
      return NextResponse.json(
        { error: 'Missing userId or groupId parameters' },
        { status: 400 }
      );
    }
    
    // Get the student profile ID for this user
    const { data: studentProfile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (profileError || !studentProfile) {
      console.error('Error finding student profile:', profileError);
      return NextResponse.json(
        { error: 'Could not find your student profile' },
        { status: 404 }
      );
    }
    
    // Use the student profile ID for student_id
    const studentId = studentProfile.id;
    
    // Get drive links using admin privileges
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .select('*')
      .eq('student_id', studentId)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching drive links:', error);
      return NextResponse.json(
        { error: `Failed to fetch drive links: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error in drive-links API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId');
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId parameter' },
        { status: 400 }
      );
    }
    
    // Delete drive link using admin privileges
    const { error } = await supabaseAdmin
      .from('student_drive_links')
      .delete()
      .eq('id', linkId);
      
    if (error) {
      console.error('Error deleting drive link:', error);
      return NextResponse.json(
        { error: `Failed to delete drive link: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error in drive-links API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId');
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId parameter' },
        { status: 400 }
      );
    }
    
    const { url: newUrl, description } = await request.json();
    
    if (!newUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }
    
    // Update drive link using admin privileges
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .update({
        url: newUrl,
        description: description || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating drive link:', error);
      return NextResponse.json(
        { error: `Failed to update drive link: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error in drive-links API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
