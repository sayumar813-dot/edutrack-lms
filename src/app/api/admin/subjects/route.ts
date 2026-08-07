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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, subjects: [] });
    }

    const formattedSubjects = (subjects || []).map((s: any) => ({
      _id: s.id,
      name: s.name,
      code: s.code,
      createdAt: s.created_at,
    }));

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
    const { name, code } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Subject name is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const subjectCode = code ? code.trim().toUpperCase() : name.trim().slice(0, 4).toUpperCase() + '101';

    const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert({
        name: name.trim(),
        code: subjectCode,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject created successfully.',
      subject: newSubject,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return NextResponse.json({ error: 'Server error creating subject.' }, { status: 500 });
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
