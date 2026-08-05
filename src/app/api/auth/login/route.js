import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/jwt';

export async function POST(req) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return Response.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify selected role matches user role
    if (role && user.role !== role) {
      return Response.json(
        { error: `Account is not registered as ${role.toUpperCase()}. Please select the correct role.` },
        { status: 401 }
      );
    }

    // Check Account Lockout status
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.lockedUntil) - new Date()) / (1000 * 60)
      );
      return Response.json(
        {
          error: `Account locked due to 5 failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        },
        { status: 423 }
      );
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }
      await user.save();

      return Response.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    // Set httpOnly session cookie
    await setAuthCookie({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return Response.json({
      success: true,
      name: user.name,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
