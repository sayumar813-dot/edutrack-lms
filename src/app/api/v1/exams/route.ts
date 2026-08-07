import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/exam.service';
import { createExamSchema } from '@/validators/exam.schema';

export async function GET() {
  try {
    const data = await ExamService.getExamsForSession();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createExamSchema.parse(body);
    const actorUserId = request.headers.get('x-user-id');

    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const data = await ExamService.createExam(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation error' },
      { status: 400 }
    );
  }
}
