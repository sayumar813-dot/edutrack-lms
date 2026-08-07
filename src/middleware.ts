import { NextResponse, type NextRequest } from 'next/server';
import { decryptSession } from '@/lib/auth/session';

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/admin'],
  TEACHER: ['/teacher'],
  STUDENT: ['/student'],
  PARENT: ['/parent'],
  admin: ['/admin'],
  teacher: ['/teacher'],
  student: ['/student'],
  parent: ['/parent'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token =
    req.cookies.get('edutrack_session')?.value ||
    req.cookies.get('scholarflow_session')?.value ||
    req.cookies.get('token')?.value;

  const isApiRoute = path.startsWith('/api');
  if (isApiRoute) {
    return NextResponse.next();
  }

  const isPublicRoute = path === '/';

  if (isPublicRoute) {
    if (token && path === '/') {
      const session = await decryptSession(token);
      if (session?.role) {
        return NextResponse.redirect(new URL(`/${session.role.toLowerCase()}`, req.url));
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const session = await decryptSession(token);
  if (!session) {
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.delete('edutrack_session');
    response.cookies.delete('scholarflow_session');
    response.cookies.delete('token');
    return response;
  }

  const userRole = session.role;
  const allowedPrefixes = ROLE_ROUTES[userRole] || ROLE_ROUTES[userRole.toUpperCase()] || [];
  const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));

  if (!isAllowed) {
    return NextResponse.redirect(new URL(`/${userRole.toLowerCase()}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
