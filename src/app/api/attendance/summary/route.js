import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';
import Subject from '@/models/Subject';

// GET /api/attendance/summary - Fetch attendance summary report & real-time analytics
export async function GET(req) {
  const { user: session, errorResponse } = await authenticateRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await connectToDatabase();

    // ── 1. STUDENT VIEW ──────────────────────────────────────────────────────
    // Students see ONLY their own personal attendance. Zero class-wide data.
    if (session.role === 'student') {
      const studentProfile = await Student.findOne({ userId: session.userId });
      if (!studentProfile) {
        return Response.json({
          success: true,
          stats: { percentage: 0, present: 0, absent: 0, late: 0, total: 0 },
          attendanceLog: [],
        });
      }

      // Find all session docs where this student appears in records[]
      const sessions = await Attendance.find({
        'records.studentId': studentProfile._id,
      })
        .populate('subjectId', 'name')
        .populate('classId', 'name')
        .sort({ date: -1 });

      // Extract this student's specific record from each session
      const attendanceLog = sessions.map(session => {
        const record = session.records.find(
          r => r.studentId.toString() === studentProfile._id.toString()
        );
        return {
          _id: session._id,
          date: session.date,
          subjectId: session.subjectId,
          classId: session.classId,
          status: record?.status || 'absent',
        };
      });

      const total = attendanceLog.length;
      const present = attendanceLog.filter(l => l.status === 'present').length;
      const absent = attendanceLog.filter(l => l.status === 'absent').length;
      const late = attendanceLog.filter(l => l.status === 'late').length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return Response.json({
        success: true,
        stats: { percentage, present, absent, late, total },
        attendanceLog,
      });
    }

    // ── 2. ADMIN & TEACHER VIEW ───────────────────────────────────────────────
    let query = {};

    if (session.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ success: true, records: [], analytics: buildEmptyAnalytics() });
      }
      const assignedClasses = await Class.find({ teacherId: teacherProfile._id }).select('_id');
      query.classId = { $in: assignedClasses.map(c => c._id) };
    }

    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;

    // Attendance.date is stored as a YYYY-MM-DD string, so do string comparison
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate)   query.date.$lte = endDate;
    }

    // Fetch all matching attendance session documents
    const sessions = await Attendance.find(query)
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ date: -1 });

    // ── Flatten sessions → individual student records ─────────────────────────
    // Each session has: classId, subjectId, date, records[{studentId, status}]
    // We need to populate studentId inside records for the report table.
    // Collect all unique studentIds first for a single batch population.
    const allStudentIds = [...new Set(
      sessions.flatMap(s => s.records.map(r => r.studentId.toString()))
    )];

    const studentDocs = await Student.find({ _id: { $in: allStudentIds } })
      .populate('userId', 'name email');

    const studentMap = {};
    studentDocs.forEach(st => { studentMap[st._id.toString()] = st; });

    // Build flat per-student rows (used for the report table & analytics)
    const flatRows = [];
    sessions.forEach(sessionDoc => {
      sessionDoc.records.forEach(rec => {
        flatRows.push({
          _id: `${sessionDoc._id}_${rec.studentId}`,
          date: sessionDoc.date,
          classId: sessionDoc.classId,
          subjectId: sessionDoc.subjectId,
          studentId: studentMap[rec.studentId.toString()] || { _id: rec.studentId },
          status: rec.status,
        });
      });
    });

    // ── Build Analytics ──────────────────────────────────────────────────────
    const totalRecords = flatRows.length;
    const totalPresent = flatRows.filter(r => r.status === 'present').length;
    const totalAbsent  = flatRows.filter(r => r.status === 'absent').length;
    const totalLate    = flatRows.filter(r => r.status === 'late').length;
    const overallRate  = totalRecords > 0
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100)
      : 0;

    // Daily Trends — last 7 calendar days present in data
    const trendsMap = {};
    flatRows.forEach(r => {
      const dStr = r.date; // Already YYYY-MM-DD
      if (!trendsMap[dStr]) {
        trendsMap[dStr] = { date: dStr, present: 0, absent: 0, late: 0, total: 0 };
      }
      trendsMap[dStr][r.status] = (trendsMap[dStr][r.status] || 0) + 1;
      trendsMap[dStr].total += 1;
    });
    const dailyTrends = Object.values(trendsMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    // Class Performance Breakdown
    const classMap = {};
    flatRows.forEach(r => {
      const cName = r.classId?.name || 'Unassigned';
      if (!classMap[cName]) {
        classMap[cName] = { className: cName, present: 0, absent: 0, late: 0, total: 0 };
      }
      classMap[cName][r.status] = (classMap[cName][r.status] || 0) + 1;
      classMap[cName].total += 1;
    });
    const classPerformance = Object.values(classMap).map(c => ({
      ...c,
      rate: c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0,
    }));

    return Response.json({
      success: true,
      records: flatRows,
      analytics: {
        totalRecords,
        totalPresent,
        totalAbsent,
        totalLate,
        overallRate,
        dailyTrends,
        classPerformance,
      },
    });
  } catch (error) {
    console.error('Attendance summary error:', error);
    return Response.json({ error: 'Server error fetching attendance summary.' }, { status: 500 });
  }
}

function buildEmptyAnalytics() {
  return {
    totalRecords: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    overallRate: 0,
    dailyTrends: [],
    classPerformance: [],
  };
}
