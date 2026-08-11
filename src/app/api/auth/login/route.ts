import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/jwt';
import { createAdminClient } from '@/lib/supabase/server';

const LOCAL_USERS: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  roles: string[];
}[] = [
  {
    id: 'admin-001',
    email: 'admin@edutrack.com',
    passwordHash: '$2b$12$lx8tAhwo3PTjseYpUVf8IeNCWvUKwm4XJnYOg1scXNRZAyEGBKcly',
    name: 'Admin User',
    role: 'admin',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'superadmin-001',
    email: 'superadmin@edutrack.com',
    passwordHash: '$2b$12$lx8tAhwo3PTjseYpUVf8IeNCWvUKwm4XJnYOg1scXNRZAyEGBKcly',
    name: 'Super Administrator',
    role: 'super_admin',
    roles: ['SUPER_ADMIN'],
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
    let foundUser: any = null;

    // 1. Try checking live Supabase user_profiles
    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', emailNorm)
        .maybeSingle();

      if (profile) {
        let authenticated = false;

        // 1a. Try Supabase Auth
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: emailNorm,
            password,
          });
          if (!authErr && authData?.user) authenticated = true;
        } catch (_) {}

        // 1b. Fallback: check profile.password_hash via bcrypt
        if (!authenticated && profile.password_hash) {
          const match = await bcrypt.compare(password, profile.password_hash);
          if (match) authenticated = true;
        }

        if (authenticated) {
          const rolesArray = profile.roles || ['STUDENT'];
          const primaryRole = rolesArray.includes('SUPER_ADMIN')
            ? 'super_admin'
            : rolesArray.includes('ADMIN')
            ? 'admin'
            : rolesArray[0]?.toLowerCase() || 'student';

          foundUser = {
            id: profile.id,
            email: profile.email,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email.split('@')[0],
            role: primaryRole,
            roles: rolesArray,
          };
        }
      }
    } catch (_) {}

    // 2. Fallback to LOCAL_USERS if not authenticated via Supabase
    if (!foundUser) {
      const localRecord = LOCAL_USERS.find((u) => u.email.toLowerCase() === emailNorm);
      if (localRecord) {
        const passwordMatch = await bcrypt.compare(password, localRecord.passwordHash);
        if (passwordMatch) {
          foundUser = {
            id: localRecord.id,
            email: localRecord.email,
            name: localRecord.name,
            role: localRecord.role,
            roles: localRecord.roles,
          };
        }
      }
    }

    if (!foundUser) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Role check validation if client passed a target role
    if (role) {
      const reqRole = role.toLowerCase();
      const userRole = foundUser.role.toLowerCase();
      const userRoles = (foundUser.roles || [userRole]).map((r: string) => r.toLowerCase());

      const isSuperAdmin = userRoles.includes('super_admin');
      const isAdmin = userRoles.includes('admin') || isSuperAdmin;

      let match = false;
      if (reqRole === 'admin' && isAdmin) match = true;
      else if (reqRole === 'super_admin' && isSuperAdmin) match = true;
      else if (userRoles.includes(reqRole)) match = true;

      if (!match) {
        return NextResponse.json(
          { error: `Account registered as ${foundUser.role.toUpperCase()}, not ${role.toUpperCase()}.` },
          { status: 401 }
        );
      }
    }

    // Set JWT Cookie
    await setAuthCookie({
      userId: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      roles: foundUser.roles,
    });

    return NextResponse.json({
      success: true,
      name: foundUser.name,
      role: foundUser.role,
      roles: foundUser.roles,
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
