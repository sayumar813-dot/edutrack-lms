import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/services/assignment.service';
import { createAssignmentSchema } from '@/validators/assignment.schema';

export async function GET() {
  try {
    const data = await AssignmentService.getAssignmentsForSession();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAssignmentSchema.parse(body);
    const actorUserId = request.headers.get('x-user-id');

    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const data = await AssignmentService.createAssignment(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation or execution error' },
      { status: 400 }
    );
  }
}
