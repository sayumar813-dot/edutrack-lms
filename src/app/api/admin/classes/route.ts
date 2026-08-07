import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = await createClient();

    const { data: classesList, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, classes: [] });
    }

    const formattedClasses = (classesList || []).map((c: any) => ({
      _id: c.id,
      name: c.name,
      section: c.section,
      roomNumber: c.room_number,
      createdAt: c.created_at,
    }));

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
    const { name, section, roomNumber } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Class name is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        name: name.trim(),
        section: section ? section.trim() : null,
        room_number: roomNumber ? roomNumber.trim() : null,
      })
      .select()
      .single();

    if (error) {
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
    const { id, name, section, roomNumber } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Class ID and Name are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update({
        name: name.trim(),
        section: section ? section.trim() : null,
        room_number: roomNumber ? roomNumber.trim() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
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

    const supabase = await createClient();
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
