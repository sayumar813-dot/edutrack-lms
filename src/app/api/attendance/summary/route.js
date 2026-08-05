import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';
import Subject from '@/models/Subject';

// GET /api/attendance/summary - Fetch attendance summary report
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

    // 1. STUDENT PRIVACY ENFORCEMENT:
    // Students see ONLY their own personal attendance log. Zero class-wide stats or peer data.
    if (session.role === 'student') {
      const studentProfile = await Student.findOne({ userId: session.userId });
      if (!studentProfile) {
        return Response.json({
          success: true,
          stats: { percentage: 0, present: 0, absent: 0, late: 0, total: 0 },
          attendanceLog: [],
        });
      }

      const logs = await Attendance.find({ studentId: studentProfile._id })
        .populate('subjectId', 'name')
        .sort({ date: -1 });

      const total = logs.length;
      const present = logs.filter((l) => l.status === 'present').length;
      const absent = logs.filter((l) => l.status === 'absent').length;
      const late = logs.filter((l) => l.status === 'late').length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return Response.json({
        success: true,
        stats: { percentage, present, absent, late, total },
        attendanceLog: logs,
      });
    }

    // 2. TEACHER SCOPING & ADMIN OVERVIEW:
    let query = {};

    if (session.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ success: true, records: [] });
      }

      const assignedClasses = await Class.find({ teacherId: teacherProfile._id }).select('_id');
      const classIds = assignedClasses.map((c) => c._id);
      query.classId = { $in: classIds };
    }

    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query)
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ date: -1 });

    return Response.json({ success: true, records });
  } catch (error) {
    console.error('Attendance summary error:', error);
    return Response.json({ error: 'Server error fetching attendance summary.' }, { status: 500 });
  }
}
