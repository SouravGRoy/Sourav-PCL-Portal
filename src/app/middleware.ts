import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';



export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protect /profile/complete and /dashboard
  if (req.nextUrl.pathname.startsWith("/profile/complete") || req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  // Allow access to /auth/login and /auth/register if not authenticated
  if (req.nextUrl.pathname.startsWith("/auth") && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/profile/complete", "/dashboard", "/auth/:path*"],
};