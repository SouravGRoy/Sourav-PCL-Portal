import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  console.log('Auth callback received:', { code: !!code, error, error_description });

  if (error) {
    // Handle error case
    console.log('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${error}&error_description=${error_description}`
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      console.log('Exchanging code for session...');
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?error=exchange_failed&error_description=${encodeURIComponent(sessionError.message)}`
        );
      }
      
      console.log('Session exchange successful:', !!data);
      // Redirect to login page after successful verification
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?verified=true`);
    } catch (error: any) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=exchange_failed&error_description=${encodeURIComponent(error.message || 'Failed to verify email')}`
      );
    }
  }

  console.log('No code or error found, redirecting to home');
  // If no code or error, redirect to home page
  return NextResponse.redirect(requestUrl.origin);
}
