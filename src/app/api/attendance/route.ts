import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { AttendanceService } from '@/services/attendance.service';

export async function POST(req: NextRequest) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { academicSessionId, date, records } = await req.json();

    if (!academicSessionId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Academic Session ID, Date, and Attendance records are required.' },
        { status: 400 }
      );
    }

    const savedData = await AttendanceService.markAttendance(
      { academicSessionId, date, records },
      session.userId as string
    );

    return NextResponse.json({
      success: true,
      message: 'Attendance sheet saved successfully.',
      attendance: savedData,
    });
  } catch (error) {
    console.error('Save attendance error:', error);
    return NextResponse.json({ error: 'Server error saving attendance.' }, { status: 500 });
  }
}
