import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { AttendanceService } from '@/services/attendance.service';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { academicSessionId, date, records } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Attendance records array is required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let targetSessionId = academicSessionId;
    if (!targetSessionId) {
      const { data: sess } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      targetSessionId = sess?.id;
    }
    if (!targetSessionId) {
      const { data: anySess } = await supabase
        .from('academic_sessions')
        .select('id')
        .limit(1)
        .maybeSingle();
      targetSessionId = anySess?.id || 'ad91224e-a5b8-4198-bc22-c9e55d9fccde';
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const savedData = await AttendanceService.markAttendance(
      { academicSessionId: targetSessionId, date: targetDate, records },
      (session?.userId || session?.id || 'teacher') as string
    );

    return NextResponse.json({
      success: true,
      message: 'Attendance sheet saved successfully.',
      attendance: savedData,
    });
  } catch (error: any) {
    console.error('Save attendance error:', error);
    return NextResponse.json({ error: error.message || 'Server error saving attendance.' }, { status: 500 });
  }
}
