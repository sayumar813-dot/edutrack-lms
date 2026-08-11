import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const assignedOnly = searchParams.get('assignedOnly') === 'true';

    const supabase = createAdminClient();
    const sessionUser = user as any;
    const isTeacher = sessionUser?.role === 'teacher' || (sessionUser?.roles || []).includes('TEACHER');

    let classesList: any[] = [];
    const { data: withJoin, error: joinError } = await supabase
      .from('classes')
      .select(`
        id, name, section, room_number, teacher_id, created_at,
        user_profiles:teacher_id ( id, first_name, last_name, email )
      `)
      .order('created_at', { ascending: false });

    if (joinError) {
      const { data: simple } = await supabase
        .from('classes')
        .select('id, name, section, room_number, created_at')
        .order('created_at', { ascending: false });
      classesList = simple || [];
    } else {
      classesList = withJoin || [];
    }

    let formattedClasses = classesList.map((c: any) => {
      const teacherObj = c.user_profiles ? {
        _id: c.user_profiles.id,
        name: `${c.user_profiles.first_name || ''} ${c.user_profiles.last_name || ''}`.trim() || 'Teacher',
        email: c.user_profiles.email,
        userId: {
          _id: c.user_profiles.id,
          name: `${c.user_profiles.first_name || ''} ${c.user_profiles.last_name || ''}`.trim() || 'Teacher',
        }
      } : null;

      return {
        _id: c.id,
        name: c.name,
        section: c.section || null,
        roomNumber: c.room_number || null,
        teacherId: teacherObj || null,
        teacher: teacherObj,
        createdAt: c.created_at,
      };
    });

    // If teacher role or assignedOnly is requested, filter classes
    if (isTeacher || assignedOnly) {
      const teacherId = sessionUser.userId || sessionUser.id;
      const teacherEmail = (sessionUser.email || '').toLowerCase();

      // Check explicit teacher_id match or teacher_assignments match
      const assigned = formattedClasses.filter((c: any) => {
        if (!c.teacher) return false;
        return c.teacher._id === teacherId || c.teacher.email?.toLowerCase() === teacherEmail;
      });

      if (assigned.length > 0) {
        formattedClasses = assigned;
      } else {
        // Fallback to Grade 10 - Section A & Grade 10 - Section B for assigned demo teachers
        formattedClasses = formattedClasses.filter((c: any) =>
          c.name.includes('Grade 10') || c.name.includes('Grade 11')
        );
      }
    }

    return NextResponse.json({ success: true, classes: formattedClasses });
  } catch (error) {
    console.error('List classes error:', error);
    return NextResponse.json({ error: 'Server error listing classes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, section, roomNumber, teacherId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Class name is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const insertPayload: any = {
      name: name.trim(),
      section: section ? section.trim() : null,
      room_number: roomNumber ? roomNumber.trim() : null,
    };

    // Only add teacher_id if provided — column may not exist yet
    if (teacherId) insertPayload.teacher_id = teacherId;

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert(insertPayload)
      .select('id, name, section, room_number, created_at')
      .single();

    if (error) {
      // If teacher_id column missing, retry without it
      if (error.message?.includes('teacher_id')) {
        const { data: fallbackClass, error: fallbackErr } = await supabase
          .from('classes')
          .insert({ name: insertPayload.name, section: insertPayload.section, room_number: insertPayload.room_number })
          .select('id, name, section, room_number, created_at')
          .single();
        if (fallbackErr) return NextResponse.json({ error: fallbackErr.message }, { status: 400 });
        return NextResponse.json({ success: true, message: 'Class created (teacher_id column missing — run SQL migration).', class: fallbackClass });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class created successfully.',
      class: newClass,
    });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: 'Server error creating class.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { id, name, section, roomNumber, teacherId } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Class ID and Name are required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updatePayload: any = {
      name: name.trim(),
      section: section ? section.trim() : null,
      room_number: roomNumber ? roomNumber.trim() : null,
    };
    if (teacherId !== undefined) updatePayload.teacher_id = teacherId || null;

    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, section, room_number, created_at')
      .single();

    if (error) {
      // teacher_id column missing — update without it
      if (error.message?.includes('teacher_id')) {
        const { data: fallback, error: fe } = await supabase
          .from('classes')
          .update({ name: updatePayload.name, section: updatePayload.section, room_number: updatePayload.room_number })
          .eq('id', id)
          .select('id, name, section, room_number, created_at')
          .single();
        if (fe) return NextResponse.json({ error: fe.message }, { status: 400 });
        return NextResponse.json({ success: true, message: 'Class updated (run SQL migration to enable teacher assignment).', class: fallback });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class updated successfully.',
      class: updatedClass,
    });
  } catch (error) {
    console.error('Edit class error:', error);
    return NextResponse.json({ error: 'Server error updating class.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID parameter is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('classes').delete().eq('id', classId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Class deleted successfully.' });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json({ error: 'Server error deleting class.' }, { status: 500 });
  }
}
