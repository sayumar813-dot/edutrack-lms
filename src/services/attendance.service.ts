import { createClient } from '@/lib/supabase/server';
import { MarkAttendanceInput } from '@/validators/attendance.schema';
import { AuditService } from './audit.service';
import { AlertService } from './alert.service';

export class AttendanceService {
  /**
   * Fetch attendance records for current active session.
   * Engine-level RLS automatically filters rows based on JWT claims and active session ID.
   */
  static async getAttendanceForSession() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        date,
        status,
        academic_session_id,
        student_profiles (
          id,
          roll_number,
          user_profiles (
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark or upsert attendance records & trigger automated escalation alert events.
   */
  static async markAttendance(input: MarkAttendanceInput, actorUserId?: string) {
    const supabase = await createClient();

    const attendancePayloads = input.records.map((r) => ({
      student_id: r.studentId,
      academic_session_id: input.academicSessionId,
      date: input.date,
      status: r.status,
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendancePayloads, { onConflict: 'student_id, date' })
      .select();

    if (error) {
      throw new Error(`Failed to save attendance: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'ATTENDANCE_MARKED',
      entity: 'Attendance',
      payload: { date: input.date, count: input.records.length },
    });

    // Trigger Smart Alerts for Absent students asynchronously
    const absentRecords = input.records.filter((r) => r.status === 'ABSENT');
    if (absentRecords.length > 0) {
      setTimeout(async () => {
        for (const abs of absentRecords) {
          try {
            // Check past 7 days attendance for consecutive/repeated absences
            const { data: pastAbsences } = await supabase
              .from('attendance')
              .select('id, date, status')
              .eq('student_id', abs.studentId)
              .eq('status', 'ABSENT')
              .order('date', { ascending: false })
              .limit(5);

            const isRepeated = (pastAbsences || []).length >= 2;
            const eventType = isRepeated ? 'REPEATED_ABSENCE' : 'STUDENT_ABSENCE';

            await AlertService.processEvent(eventType, {
              title: isRepeated ? `⚠️ Repeated Absence Alert` : `🔴 Student Absent Notice`,
              message: isRepeated
                ? `Student has been recorded absent for ${pastAbsences?.length} days.`
                : `Student recorded absent on ${input.date}.`,
              entityId: abs.studentId,
            });
          } catch (_) {}
        }
      }, 100);
    }

    return data;
  }
}
