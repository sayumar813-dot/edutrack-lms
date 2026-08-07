import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select(`
        *,
        user_profiles:teacher_id (
          id,
          first_name,
          last_name,
          email
        ),
        classes:class_id (
          id,
          name,
          section
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallbackSubjects } = await supabase.from('subjects').select('*').order('created_at', { ascending: false });
      const formattedFallback = (fallbackSubjects || []).map((s: any) => ({
        _id: s.id,
        name: s.name,
        code: s.code,
        classId: s.class_id || null,
        teacherId: s.teacher_id || null,
        createdAt: s.created_at,
      }));
      return NextResponse.json({ success: true, subjects: formattedFallback });
    }

    const formattedSubjects = (subjects || []).map((s: any) => {
      const teacherObj = s.user_profiles ? {
        _id: s.user_profiles.id,
        name: `${s.user_profiles.first_name || ''} ${s.user_profiles.last_name || ''}`.trim() || 'Teacher',
        email: s.user_profiles.email,
        userId: {
          _id: s.user_profiles.id,
          name: `${s.user_profiles.first_name || ''} ${s.user_profiles.last_name || ''}`.trim() || 'Teacher',
        }
      } : null;

      const classObj = s.classes ? {
        _id: s.classes.id,
        name: s.classes.name,
        section: s.classes.section,
      } : null;

      return {
        _id: s.id,
        name: s.name,
        code: s.code,
        classId: classObj || s.class_id || null,
        teacherId: teacherObj || s.teacher_id || null,
        teacher: teacherObj,
        createdAt: s.created_at,
      };
    });

    return NextResponse.json({ success: true, subjects: formattedSubjects });
  } catch (error) {
    console.error('List subjects error:', error);
    return NextResponse.json({ error: 'Server error listing subjects.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, code, classId, teacherId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Subject name is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const subjectCode = code ? code.trim().toUpperCase() : name.trim().slice(0, 4).toUpperCase() + '101';

    const insertPayload: any = {
      name: name.trim(),
      code: subjectCode,
    };
    if (classId) insertPayload.class_id = classId;
    if (teacherId) insertPayload.teacher_id = teacherId;

    const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log teacher assignment if applicable
    if (teacherId && classId) {
      try {
        const { data: activeSession } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('is_current', true)
          .maybeSingle();

        if (activeSession?.id) {
          await supabase.from('teacher_assignments').upsert({
            teacher_id: teacherId,
            class_id: classId,
            subject_id: newSubject.id,
            academic_session_id: activeSession.id,
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Subject created & teacher assigned successfully.',
      subject: newSubject,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return NextResponse.json({ error: 'Server error creating subject.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { id, teacherId, classId, name, code } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updatePayload: any = {};
    if (name) updatePayload.name = name.trim();
    if (code) updatePayload.code = code.trim().toUpperCase();
    if (classId !== undefined) updatePayload.class_id = classId || null;
    if (teacherId !== undefined) updatePayload.teacher_id = teacherId || null;

    const { data: updatedSubject, error } = await supabase
      .from('subjects')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (teacherId && (classId || updatedSubject?.class_id)) {
      try {
        const targetClassId = classId || updatedSubject.class_id;
        const { data: activeSession } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('is_current', true)
          .maybeSingle();

        if (activeSession?.id) {
          await supabase.from('teacher_assignments').upsert({
            teacher_id: teacherId,
            class_id: targetClassId,
            subject_id: id,
            academic_session_id: activeSession.id,
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher assigned to subject successfully.',
      subject: updatedSubject,
    });
  } catch (error) {
    console.error('Assign teacher subject error:', error);
    return NextResponse.json({ error: 'Server error assigning teacher to subject.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('id');

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    console.error('Delete subject error:', error);
    return NextResponse.json({ error: 'Server error deleting subject.' }, { status: 500 });
  }
}
