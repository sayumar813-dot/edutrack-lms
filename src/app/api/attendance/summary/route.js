import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';

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
        return Response.json({ error: 'Student profile not found.' }, { status: 404 });
      }

      const query = { 'records.studentId': studentProfile._id };
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      const attendanceSheets = await Attendance.find(query)
        .populate('classId', 'name')
        .populate('subjectId', 'name')
        .sort({ date: -1 });

      // Return strictly personal individual record
      const studentRecords = attendanceSheets.map(sheet => {
        const myRecord = sheet.records.find(
          r => r.studentId.toString() === studentProfile._id.toString()
        );
        return {
          date: sheet.date,
          className: sheet.classId?.name,
          subjectName: sheet.subjectId?.name,
          status: myRecord ? myRecord.status : 'N/A',
        };
      });

      return Response.json({ success: true, summary: studentRecords });
    }

    // 2. TEACHER PRIVACY & PERMISSION SCOPING:
    if (session.role === 'teacher') {
      if (!classId) {
        return Response.json({ error: 'Class ID query parameter is required.' }, { status: 400 });
      }

      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ error: 'Teacher profile not found.' }, { status: 404 });
      }

      // Verify the requested class is assigned to this teacher
      const assignedClass = await Class.findOne({ _id: classId, teacherId: teacherProfile._id });
      if (!assignedClass) {
        return Response.json(
          { error: 'Forbidden. You can only view attendance for classes assigned to you.' },
          { status: 403 }
        );
      }
    }

    // 3. ADMIN / VERIFIED TEACHER QUERY EXECUTION:
    if (!classId) {
      return Response.json({ error: 'Class ID query parameter is required.' }, { status: 400 });
    }

    const query = { classId };
    if (subjectId) query.subjectId = subjectId;
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const sheets = await Attendance.find(query)
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .populate('markedBy', 'name')
      .populate({
        path: 'records.studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ date: -1 });

    return Response.json({ success: true, sheets });
  } catch (error) {
    console.error('Attendance summary error:', error);
    return Response.json({ error: 'Server error generating summary report.' }, { status: 500 });
  }
}
