import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/services/student.service';
import { z } from 'zod';

const createStudentInputSchema = z.object({
  userId: z.string().uuid('Invalid User ID'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  academicSessionId: z.string().uuid('Invalid Academic Session ID'),
});

export async function GET() {
  try {
    const students = await StudentService.getStudentsForSession();
    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStudentInputSchema.parse(body);

    const actorUserId = request.headers.get('x-user-id') || undefined;

    const student = await StudentService.createStudentProfile(parsed, actorUserId);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation or execution error' },
      { status: 400 }
    );
  }
}
