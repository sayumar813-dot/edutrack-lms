import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET(req) {
  const { user: session, errorResponse } = await authenticateRequest(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const user = await User.findById(session.userId).select(
      '-passwordHash -failedLoginAttempts -lockedUntil'
    );

    if (!user) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    return Response.json({ success: true, user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return Response.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
