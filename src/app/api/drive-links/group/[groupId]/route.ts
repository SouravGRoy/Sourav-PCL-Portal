import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key (admin privileges)
// This bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing groupId parameter' },
        { status: 400 }
      );
    }
    
    // Get all drive links for this group with student profile info
    const { data, error } = await supabaseAdmin
      .from('student_drive_links')
      .select(`
        *,
        profiles:student_id (name, email)
      `)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching group drive links:', error);
      return NextResponse.json(
        { error: `Failed to fetch group drive links: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error in group drive-links API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
