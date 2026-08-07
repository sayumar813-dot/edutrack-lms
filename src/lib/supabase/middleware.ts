import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Safe guard: if Supabase credentials are not configured, pass through gracefully
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users navigating to protected dashboard paths
    if (
      !user &&
      (request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/teacher') ||
        request.nextUrl.pathname.startsWith('/student') ||
        request.nextUrl.pathname.startsWith('/parent'))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Inject session context variables into downstream Request Headers
    if (user) {
      const activeSessionId = user.app_metadata?.academic_session_id || '';
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-academic-session-id', activeSessionId);
    }
  } catch {
    // Graceful fallback if Supabase service is unreachable locally
  }

  return response;
}
