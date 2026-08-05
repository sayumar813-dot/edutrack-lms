import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Attendance from '@/models/Attendance';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';

// POST /api/attendance - Save/Update attendance sheet
export async function POST(req) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { classId, subjectId, date, records } = await req.json();

    if (!classId || !subjectId || !date || !records || !Array.isArray(records)) {
      return Response.json(
        { error: 'Class, Subject, Date, and Attendance records are required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Teacher Scoping & Same-Day Rule Enforcements:
    if (session.role === 'teacher') {
      // 1. Same-Day Edit Rule: Teachers can only edit current day's attendance
      const todayISO = new Date().toISOString().split('T')[0];
      if (date !== todayISO) {
        return Response.json(
          { error: 'Teachers are only permitted to mark or edit attendance for the current day.' },
          { status: 403 }
        );
      }

      // 2. Class Assignment Scoping: Teacher can only mark attendance for their assigned classes
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ error: 'Teacher profile not found.' }, { status: 404 });
      }

      const assignedClass = await Class.findOne({ _id: classId, teacherId: teacherProfile._id });
      if (!assignedClass) {
        return Response.json(
          { error: 'Forbidden. You can only mark attendance for classes assigned to you.' },
          { status: 403 }
        );
      }
    }

    // Upsert today's attendance for the specific class and subject
    const attendance = await Attendance.findOneAndUpdate(
      { classId, subjectId, date },
      {
        classId,
        subjectId,
        date,
        markedBy: session.userId,
        records,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return Response.json({
      success: true,
      message: 'Attendance sheet saved successfully.',
      attendance,
    });
  } catch (error) {
    console.error('Save attendance error:', error);
    return Response.json({ error: 'Server error saving attendance.' }, { status: 500 });
  }
}
