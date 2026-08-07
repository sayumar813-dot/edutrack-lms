import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/services/attendance.service';
import { markAttendanceSchema } from '@/validators/attendance.schema';

export async function GET() {
  try {
    const data = await AttendanceService.getAttendanceForSession();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = markAttendanceSchema.parse(body);

    const actorUserId = request.headers.get('x-user-id') || undefined;

    const data = await AttendanceService.markAttendance(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation or execution error' },
      { status: 400 }
    );
  }
}
