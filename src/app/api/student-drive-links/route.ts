import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges that bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { url, description, groupId } = await request.json();
    
    // Validate required fields
    if (!url || !groupId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    // Insert the drive link using admin privileges to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .insert({
        student_id: studentProfileId,
        group_id: groupId,
        url: url,
        description: description || 'No description',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error inserting drive link:', error);
      return NextResponse.json(
        { error: `Failed to insert drive link: ${error.message}` },
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing groupId parameter' },
        { status: 400 }
      );
    }
    
    // Hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    // Get drive links using admin privileges
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .select('*')
      .eq('student_id', studentProfileId)
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
    
    // Hardcoded student profile ID for testing
    const studentProfileId = "3b728a42-0478-4c59-a9a3-838709aa932b";
    
    // Delete the drive link using admin privileges
    const { error } = await supabaseAdmin
      .from('student_drive_links')
      .delete()
      .eq('id', linkId)
      .eq('student_id', studentProfileId);
      
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
