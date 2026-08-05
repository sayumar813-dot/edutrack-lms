import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  const { user: session, errorResponse } = await authenticateRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return Response.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(session.userId);

    if (!user) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    // Hash and update new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    user.mustResetPassword = false;
    await user.save();

    return Response.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return Response.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
