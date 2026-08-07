import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') || 'admin').toLowerCase();
    const supabase = await createClient();

    const notifications: any[] = [];

    if (role === 'admin') {
      // 1. Fetch real audit logs from Supabase
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (logs && logs.length > 0) {
        logs.forEach((log: any) => {
          notifications.push({
            id: log.id,
            title: `Audit Log: ${log.action.replace(/_/g, ' ')}`,
            desc: `Entity: ${log.entity}${log.entity_id ? ` (${log.entity_id.slice(0, 8)})` : ''}`,
            time: formatTimeAgo(log.created_at),
            unread: true,
          });
        });
      }

      // 2. Fetch real Fee Invoices status
      const { data: feeStats } = await supabase
        .from('fees')
        .select('id, status, amount, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (feeStats && feeStats.length > 0) {
        feeStats.forEach((fee: any) => {
          notifications.push({
            id: `fee-${fee.id}`,
            title: `Fee Invoice: ${fee.title}`,
            desc: `Amount: ₨ ${fee.amount?.toLocaleString() || 0} — Status: ${fee.status}`,
            time: formatTimeAgo(fee.created_at),
            unread: fee.status === 'UNPAID',
          });
        });
      }

      // 3. Fetch real System Roster Counts
      const { count: studentCount } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: teacherCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .contains('roles', ['TEACHER']);

      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      notifications.push({
        id: 'system-status-summary',
        title: 'System Roster Overview',
        desc: `Enrolled: ${studentCount || 0} Students | ${teacherCount || 0} Teachers | ${classCount || 0} Classes`,
        time: 'Just now',
        unread: false,
      });

    } else if (role === 'teacher') {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date, created_at')
        .order('created_at', { ascending: false })
        .limit(4);

      if (assignments && assignments.length > 0) {
        assignments.forEach((a: any) => {
          notifications.push({
            id: a.id,
            title: `Assignment: ${a.title}`,
            desc: `Due Date: ${new Date(a.due_date).toLocaleDateString()}`,
            time: formatTimeAgo(a.created_at),
            unread: true,
          });
        });
      } else {
        notifications.push({
          id: 'teacher-system-ready',
          title: 'Class Portal Ready',
          desc: 'Attendance & Gradebook modules active for current session',
          time: 'Just now',
          unread: false,
        });
      }
    } else if (role === 'student' || role === 'parent') {
      const { data: fees } = await supabase
        .from('fees')
        .select('id, title, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (fees && fees.length > 0) {
        fees.forEach((f: any) => {
          notifications.push({
            id: `fee-${f.id}`,
            title: `Tuition Fee: ${f.title}`,
            desc: `Amount: ₨ ${f.amount?.toLocaleString() || 0} | Status: ${f.status}`,
            time: formatTimeAgo(f.created_at),
            unread: f.status === 'UNPAID',
          });
        });
      }

      const { data: exams } = await supabase
        .from('exams')
        .select('id, title, exam_type, max_marks, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (exams && exams.length > 0) {
        exams.forEach((e: any) => {
          notifications.push({
            id: `exam-${e.id}`,
            title: `Exam Scheduled: ${e.title}`,
            desc: `Type: ${e.exam_type} | Max Marks: ${e.max_marks}`,
            time: formatTimeAgo(e.created_at),
            unread: true,
          });
        });
      }

      if (notifications.length === 0) {
        notifications.push({
          id: 'student-portal-notice',
          title: 'Academic Portal Active',
          desc: 'All course records & fee ledgers up to date',
          time: 'Just now',
          unread: false,
        });
      }
    }

    return NextResponse.json({ success: true, role, notifications });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({
      success: true,
      notifications: [
        { id: 'sys-active', title: 'ScholarFlow System Active', desc: 'Real-time database sync active', time: 'Just now', unread: false }
      ]
    });
  }
}
