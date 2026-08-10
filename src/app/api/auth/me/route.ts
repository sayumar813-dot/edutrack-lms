import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const session = (await getAuthCookie()) as any;

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    const rolesArray: string[] = (session.roles as string[]) || [(session.role as string)?.toUpperCase() || 'STUDENT'];
    const isSuperAdmin = rolesArray.includes('SUPER_ADMIN') || session.role === 'super_admin';
    const isAdmin = rolesArray.includes('ADMIN') || isSuperAdmin || session.role === 'admin';

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        roles: rolesArray,
        isSuperAdmin,
        isAdmin,
        mustResetPassword: false,
      },
    });
  } catch (error) {
    console.error('[Me] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
