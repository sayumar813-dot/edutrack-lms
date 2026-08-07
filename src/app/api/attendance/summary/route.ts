import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { AttendanceService } from '@/services/attendance.service';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const rawAttendance = await AttendanceService.getAttendanceForSession();

    const flatRows = (rawAttendance || []).map((row: any) => ({
      _id: row.id,
      date: row.date,
      status: row.status ? row.status.toLowerCase() : 'present',
      studentId: {
        _id: row.student_profiles?.id,
        rollNo: row.student_profiles?.roll_number,
        userId: {
          name: `${row.student_profiles?.user_profiles?.first_name || ''} ${row.student_profiles?.user_profiles?.last_name || ''}`.trim() || 'Student',
          email: row.student_profiles?.user_profiles?.email || '',
        },
      },
    }));

    const totalRecords = flatRows.length;
    const totalPresent = flatRows.filter((r: any) => r.status === 'present').length;
    const totalAbsent = flatRows.filter((r: any) => r.status === 'absent').length;
    const totalLate = flatRows.filter((r: any) => r.status === 'late').length;
    const overallRate = totalRecords > 0 ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) : 0;

    return NextResponse.json({
      success: true,
      records: flatRows,
      analytics: {
        totalRecords,
        totalPresent,
        totalAbsent,
        totalLate,
        overallRate,
        dailyTrends: [],
        classPerformance: [],
      },
    });
  } catch (error) {
    console.error('Attendance summary error:', error);
    return NextResponse.json({ error: 'Server error fetching attendance summary.' }, { status: 500 });
  }
}
