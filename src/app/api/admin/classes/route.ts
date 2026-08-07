import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: classesList, error } = await supabase
      .from('classes')
      .select(`
        *,
        user_profiles:teacher_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallbackList } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
      const formattedFallback = (fallbackList || []).map((c: any) => ({
        _id: c.id,
        name: c.name,
        section: c.section,
        roomNumber: c.room_number,
        teacherId: c.teacher_id || null,
        createdAt: c.created_at,
      }));
      return NextResponse.json({ success: true, classes: formattedFallback });
    }

    const formattedClasses = (classesList || []).map((c: any) => {
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
        section: c.section,
        roomNumber: c.room_number,
        teacherId: teacherObj || c.teacher_id || null,
        teacher: teacherObj,
        createdAt: c.created_at,
      };
    });

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
    if (teacherId) insertPayload.teacher_id = teacherId;

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class created & teacher assigned successfully.',
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
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class updated & teacher assigned successfully.',
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

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully.',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json({ error: 'Server error deleting class.' }, { status: 500 });
  }
}
