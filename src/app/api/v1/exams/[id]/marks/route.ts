import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/exam.service';
import { inputExamMarksSchema } from '@/validators/exam.schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = inputExamMarksSchema.parse({ ...body, examId: id });
    const actorUserId = request.headers.get('x-user-id');

    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const data = await ExamService.inputExamMarks(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Marks entry failed' },
      { status: 400 }
    );
  }
}
