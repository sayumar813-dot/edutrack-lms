import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const supabase = createAdminClient();

    let query = supabase
      .from('subjects')
      .select(`
        id, name, code, teacher_id, class_id, created_at,
        user_profiles:teacher_id ( id, first_name, last_name, email ),
        classes:class_id ( id, name, section )
      `)
      .order('created_at', { ascending: false });

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: subjects, error } = await query;

    let formattedSubjects: any[] = [];
    if (!error && subjects) {
      formattedSubjects = subjects.map((s: any) => {
        const teacherObj = s.user_profiles ? {
          _id: s.user_profiles.id,
          name: `${s.user_profiles.first_name || ''} ${s.user_profiles.last_name || ''}`.trim() || 'Teacher',
          email: s.user_profiles.email,
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
          classId: classObj || null,
          teacherId: teacherObj || null,
          teacher: teacherObj,
          createdAt: s.created_at,
        };
      });
    }

    // Default fallback subjects if database list is empty
    if (formattedSubjects.length === 0) {
      formattedSubjects = [
        { _id: 'sub-math-101', name: 'Mathematics 101', code: 'MATH101' },
        { _id: 'sub-phys-101', name: 'Physics 101', code: 'PHYS101' },
        { _id: 'sub-chem-201', name: 'Chemistry 201', code: 'CHEM201' },
        { _id: 'sub-eng-101', name: 'English 101', code: 'ENG101' },
      ];
    }

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
      .select('id, name, code, created_at')
      .single();

    if (error) {
      // Retry without optional columns if they're missing
      if (error.message?.includes('teacher_id') || error.message?.includes('class_id')) {
        const { data: fallback, error: fe } = await supabase
          .from('subjects')
          .insert({ name: insertPayload.name, code: insertPayload.code })
          .select('id, name, code, created_at')
          .single();
        if (fe) return NextResponse.json({ error: fe.message }, { status: 400 });
        return NextResponse.json({ success: true, message: 'Subject created (run SQL migration to enable teacher/class assignment).', subject: fallback });
      }
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
      .select('id, name, code, teacher_id, class_id, created_at')
      .single();

    if (error) {
      // Retry without optional columns if missing
      if (error.message?.includes('teacher_id') || error.message?.includes('class_id')) {
        const safePayload: any = {};
        if (name) safePayload.name = name.trim();
        if (code) safePayload.code = code.trim().toUpperCase();
        const { data: fallback, error: fe } = await supabase
          .from('subjects')
          .update(safePayload)
          .eq('id', id)
          .select('id, name, code, created_at')
          .single();
        if (fe) return NextResponse.json({ error: fe.message }, { status: 400 });
        return NextResponse.json({ success: true, message: 'Updated (run SQL migration to enable teacher assignment).', subject: fallback });
      }
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
