import { createClient } from '@/lib/supabase/server';

export class ParentService {
  /**
   * Fetch linked ward student profiles for the currently logged-in parent user.
   * Utilizes the normalized `parent_student_links` junction table for index-backed queries.
   */
  static async getLinkedWards(parentUserId: string) {
    const supabase = await createClient();

    // Fetch student IDs linked in parent_student_links junction table
    const { data: links, error: linkErr } = await supabase
      .from('parent_student_links')
      .select(`
        id,
        relationship,
        student_profiles (
          id,
          roll_number,
          academic_session_id,
          user_profiles (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('parent_id', parentUserId);

    if (linkErr) {
      throw new Error(`Failed to fetch linked wards: ${linkErr.message}`);
    }

    return links.map(l => l.student_profiles);
  }

  /**
   * Get ward aggregated metrics (attendance, recent grades, unpaid fees).
   */
  static async getWardSummary(studentId: string) {
    const supabase = await createClient();

    const [attRes, feeRes, marksRes] = await Promise.all([
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('fees').select('amount, paid_amount, status').eq('student_id', studentId),
      supabase.from('exam_marks').select('marks_obtained, grade, exams(title, max_marks)').eq('student_id', studentId),
    ]);

    const attendanceRecords = attRes.data || [];
    const totalAtt = attendanceRecords.length;
    const presentAtt = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

    const fees = feeRes.data || [];
    const unpaidFees = fees.filter(f => f.status === 'UNPAID' || f.status === 'PARTIAL');
    const pendingBalance = unpaidFees.reduce((acc, curr) => acc + (Number(curr.amount) - Number(curr.paid_amount || 0)), 0);

    return {
      studentId,
      attendancePercentage: attendancePct,
      pendingBalance,
      recentGrades: marksRes.data || [],
    };
  }
}
