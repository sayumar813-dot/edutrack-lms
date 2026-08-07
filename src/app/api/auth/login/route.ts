import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/jwt';

// ─────────────────────────────────────────────────────────────────────────────
// Local user store — no database required for auth.
// Add more users here as needed. Passwords are bcrypt hashed (12 rounds).
// Admin password: mubashir7661
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_USERS: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}[] = [
  {
    id: 'admin-001',
    email: 'admin@edutrack.com',
    passwordHash: '$2b$12$lx8tAhwo3PTjseYpUVf8IeNCWvUKwm4XJnYOg1scXNRZAyEGBKcly',
    name: 'Admin User',
    role: 'admin',
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const emailNorm = email.toLowerCase().trim();

    // Find user in local store
    const userRecord = LOCAL_USERS.find(
      (u) => u.email.toLowerCase() === emailNorm
    );

    if (!userRecord) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userRecord.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify role if provided
    if (role && userRecord.role.toLowerCase() !== role.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This account is registered as ${userRecord.role.toUpperCase()}, not ${role.toUpperCase()}. Please select the correct role.`,
        },
        { status: 401 }
      );
    }

    // Set httpOnly JWT session cookie
    await setAuthCookie({
      userId: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    });

    return NextResponse.json({
      success: true,
      name: userRecord.name,
      role: userRecord.role,
      mustResetPassword: false,
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
