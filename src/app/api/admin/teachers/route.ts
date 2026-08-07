import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .contains('roles', ['TEACHER'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, teachers: [] });
    }

    const formattedTeachers = (profiles || []).map((t: any) => ({
      _id: t.id,
      userId: {
        _id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Teacher',
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
      return NextResponse.json(
        { error: 'Name and email are required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const tempPassword = password && password.trim() ? password.trim() : `Teach_${crypto.randomBytes(4).toString('hex')}!`;
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Teacher';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role: 'teacher' },
    });

    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create teacher authentication record.' }, { status: 400 });
    }

    const { data: newTeacherProfile, error: profileErr } = await supabase.from('user_profiles').upsert({
      id: authUser.user.id,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName,
      roles: ['TEACHER'],
      role: 'teacher',
    }).select().single();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher created successfully.',
      teacher: newTeacherProfile,
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

    await supabase.auth.admin.deleteUser(teacherId);
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
