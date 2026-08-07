import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/services/assignment.service';
import { submitAssignmentSchema } from '@/validators/assignment.schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = submitAssignmentSchema.parse({ ...body, assignmentId: id });
    const actorUserId = request.headers.get('x-user-id');

    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const data = await AssignmentService.submitAssignment(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Submission failed' },
      { status: 400 }
    );
  }
}
