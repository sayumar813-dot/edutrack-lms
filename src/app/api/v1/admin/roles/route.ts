import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/v1/admin/roles — list all staff accounts with their roles (Super Admin / Admin only)
export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, roles, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, users: [] });
    }

    const formattedUsers = (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email?.split('@')[0],
      roles: u.roles || ['STUDENT'],
      isSuperAdmin: (u.roles || []).includes('SUPER_ADMIN'),
      isAdmin: (u.roles || []).includes('ADMIN') || (u.roles || []).includes('SUPER_ADMIN'),
      createdAt: u.created_at,
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Server error listing staff accounts.' }, { status: 500 });
  }
}

// PUT /api/v1/admin/roles — Elevate or demote user roles (SUPER_ADMIN ONLY)
export async function PUT(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  const rolesList: string[] = (user as any)?.roles || [];
  const isSuperAdmin = rolesList.includes('SUPER_ADMIN') || (user as any)?.role === 'super_admin';

  // Strict check: Only SUPER_ADMIN can modify user roles
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only Super Administrators can elevate or modify account roles.' },
      { status: 403 }
    );
  }

  try {
    const { targetUserId, newRole } = await req.json(); // newRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT'

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'targetUserId and newRole are required.' }, { status: 400 });
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT'];
    const roleUpper = newRole.toUpperCase();
    if (!validRoles.includes(roleUpper)) {
      return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Prevent demoting self if sole Super Admin
    if (targetUserId === (user as any).id && roleUpper !== 'SUPER_ADMIN') {
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .contains('roles', ['SUPER_ADMIN']);

      if ((count || 0) <= 1) {
        return NextResponse.json({ error: 'Cannot demote the only remaining Super Admin.' }, { status: 400 });
      }
    }

    // Update user_profiles roles array
    const updatedRoles = roleUpper === 'SUPER_ADMIN' ? ['SUPER_ADMIN', 'ADMIN'] : [roleUpper];
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({ roles: updatedRoles })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Sync auth.users metadata if possible
    try {
      await supabase.auth.admin.updateUserById(targetUserId, {
        user_metadata: { role: roleUpper.toLowerCase() },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Account ${updated.email} role updated to ${roleUpper}.`,
      user: updated,
    });
  } catch (error: any) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: error.message || 'Server error updating role.' }, { status: 500 });
  }
}
