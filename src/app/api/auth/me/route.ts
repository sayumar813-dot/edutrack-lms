import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthCookie();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
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
