import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: students, error } = await supabase
      .from('student_profiles')
      .select(`
        id,
        roll_number,
        academic_session_id,
        created_at,
        user_profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, students: [] });
    }

    const formattedStudents = (students || []).map((s: any) => {
      const roll = (s.roll_number || '').toUpperCase();
      let className = 'Grade 10 - Section A';

      if (roll.startsWith('STU-91')) className = 'Grade 9 - Section A';
      else if (roll.startsWith('STU-92')) className = 'Grade 9 - Section B';
      else if (roll.startsWith('STU-100') || roll.startsWith('STU-101')) className = 'Grade 10 - Section A';
      else if (roll.startsWith('STU-102') || roll.startsWith('STU-103')) className = 'Grade 10 - Section B';
      else if (roll.startsWith('STU-11')) className = 'Grade 11 - Science';

      return {
        _id: s.id,
        rollNo: s.roll_number,
        classId: { _id: `cls-${className.replace(/\s+/g, '-').toLowerCase()}`, name: className },
        class: className,
        userId: {
          _id: s.user_profiles?.id || s.id,
          name: `${s.user_profiles?.first_name || ''} ${s.user_profiles?.last_name || ''}`.trim() || 'Student',
          email: s.user_profiles?.email || '',
          createdAt: s.created_at,
        },
      };
    });

    return NextResponse.json({ success: true, students: formattedStudents });
  } catch (error) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Server error listing students.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, email, rollNo, guardianEmail, password } = await req.json();

    if (!name || !email || !rollNo) {
      return NextResponse.json(
        { error: 'Name, email, and roll number are required.' },
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
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 400 }
      );
    }

    const finalPassword = password && password.trim() ? password.trim() : `Stud_${crypto.randomBytes(4).toString('hex')}!`;
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: finalPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role: 'student' },
    });

    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create student authentication record.' }, { status: 400 });
    }

    await supabase.from('user_profiles').upsert({
      id: authUser.user.id,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName,
      roles: ['STUDENT'],
    });

    // Create / Link Parent Account (Uses provided Guardian Email, or auto-generates parent.<student_name>@edutrack.com)
    let parentUserId: string | null = null;
    const effectiveGuardianEmail = (guardianEmail && guardianEmail.trim())
      ? guardianEmail.toLowerCase().trim()
      : `parent.${firstName.toLowerCase()}@edutrack.com`;

    const { data: parentProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', effectiveGuardianEmail)
      .maybeSingle();

    if (parentProfile?.id) {
      parentUserId = parentProfile.id;
    } else {
      const { data: parentAuth } = await supabase.auth.admin.createUser({
        email: effectiveGuardianEmail,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { first_name: 'Parent of', last_name: firstName, role: 'parent' },
      });

      if (parentAuth?.user?.id) {
        parentUserId = parentAuth.user.id;
        await supabase.from('user_profiles').upsert({
          id: parentAuth.user.id,
          email: effectiveGuardianEmail,
          first_name: 'Parent of',
          last_name: firstName,
          roles: ['PARENT'],
        });
      }
    }

    const activeSessionId = await getOrCreateActiveSessionId(supabase);

    const { data: newStudent, error: studentErr } = await supabase
      .from('student_profiles')
      .insert({
        user_id: authUser.user.id,
        roll_number: rollNo.trim(),
        academic_session_id: activeSessionId,
      })
      .select()
      .single();

    if (studentErr) {
      return NextResponse.json({ error: studentErr.message }, { status: 400 });
    }

    if (parentUserId && newStudent?.id) {
      try {
        await supabase.from('parent_student_links').upsert({
          parent_id: parentUserId,
          student_id: newStudent.id,
          relationship: 'Parent / Guardian',
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Student created successfully.',
      student: newStudent,
      tempPassword: finalPassword,
      guardianEmail: guardianEmail ? guardianEmail.trim() : null,
    });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Server error creating student.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('id');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID parameter is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: student } = await supabase
      .from('student_profiles')
      .select('id, user_id')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
    }

    await supabase.from('student_profiles').delete().eq('id', studentId);
    if (student.user_id) {
      await supabase.auth.admin.deleteUser(student.user_id);
      await supabase.from('user_profiles').delete().eq('id', student.user_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Student account deleted. Immediate access revoked.',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Server error deleting student account.' }, { status: 500 });
  }
}

async function getOrCreateActiveSessionId(supabase: any) {
  try {
    const { data: sess } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();
    if (sess?.id) return sess.id;

    const { data: anySess } = await supabase
      .from('academic_sessions')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (anySess?.id) return anySess.id;

    const { data: newSess } = await supabase
      .from('academic_sessions')
      .insert({
        name: '2026 Academic Year',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_current: true,
      })
      .select('id')
      .single();

    return newSess?.id || 'ad91224e-a5b8-4198-bc22-c9e55d9fccde';
  } catch (_) {
    return 'ad91224e-a5b8-4198-bc22-c9e55d9fccde';
  }
}
