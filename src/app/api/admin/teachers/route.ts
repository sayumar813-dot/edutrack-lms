import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    // Fetch teachers from user_profiles (role TEACHER)
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, phone_number, roles, created_at')
      .contains('roles', ['TEACHER'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Teachers fetch error:', error.message);
      return NextResponse.json({ success: true, teachers: [] });
    }

    // Also check auth.users for any teacher who may have a profile not yet showing
    // (this ensures teachers created via auth.admin.createUser always appear)
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authTeachers = (authUsers?.users || []).filter((u: any) =>
      u.user_metadata?.role === 'teacher' || u.app_metadata?.role === 'teacher'
    );

    // Build a set of IDs already in profiles
    const existingIds = new Set((profiles || []).map((p: any) => p.id));

    // Upsert any auth teachers missing from user_profiles
    const missingTeachers: any[] = [];
    for (const authUser of authTeachers) {
      if (!existingIds.has(authUser.id)) {
        const firstName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'Teacher';
        const lastName = authUser.user_metadata?.last_name || '';
        // Auto-create their profile row
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .upsert({
            id: authUser.id,
            email: authUser.email,
            first_name: firstName,
            last_name: lastName,
            roles: ['TEACHER'],
          })
          .select('id, email, first_name, last_name, phone_number, roles, created_at')
          .single();

        if (newProfile) missingTeachers.push(newProfile);
      }
    }

    const allTeacherProfiles = [...(profiles || []), ...missingTeachers];

    const formattedTeachers = allTeacherProfiles.map((t: any) => ({
      _id: t.id,
      userId: {
        _id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email?.split('@')[0] || 'Teacher',
        email: t.email,
        createdAt: t.created_at,
      },
      phone: t.phone_number || '',
      subjectsAssigned: [],
    }));

    return NextResponse.json({ success: true, teachers: formattedTeachers });
  } catch (error) {
    console.error('List teachers error:', error);
    return NextResponse.json({ error: 'Server error listing teachers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Check if already exists in auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = (authUsers?.users || []).find((u: any) => u.email === cleanEmail);

    if (existingAuthUser) {
      // Already in auth — just ensure they have a TEACHER profile row
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || 'Teacher';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: existing } = await supabase
        .from('user_profiles')
        .upsert({
          id: existingAuthUser.id,
          email: cleanEmail,
          first_name: firstName,
          last_name: lastName,
          roles: ['TEACHER'],
          phone_number: phone || null,
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        message: 'Teacher profile updated with TEACHER role.',
        teacher: existing,
        tempPassword: null,
      });
    }

    const tempPassword = password?.trim() ? password.trim() : `Teach_${crypto.randomBytes(4).toString('hex')}!`;
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Teacher';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role: 'teacher' },
    });

    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create auth account.' }, { status: 400 });
    }

    const { data: newProfile, error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({
        id: authUser.user.id,
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        roles: ['TEACHER'],
        phone_number: phone || null,
      })
      .select()
      .single();

    if (profileErr) {
      // Profile upsert failed but auth user was created — return partial success
      return NextResponse.json({
        success: true,
        message: 'Teacher auth created. Profile sync may need DB migration.',
        teacher: { id: authUser.user.id, email: cleanEmail, first_name: firstName, last_name: lastName },
        tempPassword,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher created successfully.',
      teacher: newProfile,
      tempPassword,
    });
  } catch (error: any) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating teacher.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('id');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID parameter is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Delete auth user (soft-errors OK)
    try { await supabase.auth.admin.deleteUser(teacherId); } catch (_) {}
    await supabase.from('user_profiles').delete().eq('id', teacherId);

    return NextResponse.json({
      success: true,
      message: 'Teacher account deleted. Immediate access revoked.',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Server error removing teacher.' }, { status: 500 });
  }
}
