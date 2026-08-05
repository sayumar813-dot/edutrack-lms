import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Subject from '@/models/Subject';
import Class from '@/models/Class';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';

// GET /api/admin/subjects - List subjects based on role scoping
export async function GET(req) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    // Teacher scoping: View subjects for assigned classes or directly assigned subjects
    if (session.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ success: true, subjects: [] });
      }

      const assignedClasses = await Class.find({ teacherId: teacherProfile._id }).select('_id');
      const classIds = assignedClasses.map(c => c._id);

      const subjects = await Subject.find({
        $or: [
          { classId: { $in: classIds } },
          { _id: { $in: teacherProfile.subjectsAssigned || [] } },
        ],
      }).populate('classId', 'name');

      return Response.json({ success: true, subjects });
    }

    // Student scoping: View subjects belonging to enrolled class only
    if (session.role === 'student') {
      const studentProfile = await Student.findOne({ userId: session.userId });
      if (!studentProfile || !studentProfile.classId) {
        return Response.json({ success: true, subjects: [] });
      }

      const subjects = await Subject.find({ classId: studentProfile.classId }).populate('classId', 'name');
      return Response.json({ success: true, subjects });
    }

    // Admin scoping: Full view of all subjects
    const subjects = await Subject.find().populate('classId', 'name');
    return Response.json({ success: true, subjects });
  } catch (error) {
    console.error('List subjects error:', error);
    return Response.json({ error: 'Server error listing subjects.' }, { status: 500 });
  }
}

// POST /api/admin/subjects - Create new subject (Admin only)
export async function POST(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, classId } = await req.json();

    if (!name || !classId) {
      return Response.json(
        { error: 'Subject name and class ID are required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const newSubject = await Subject.create({
      name: name.trim(),
      classId,
    });

    return Response.json({
      success: true,
      message: 'Subject created successfully.',
      subject: newSubject,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return Response.json({ error: 'Server error creating subject.' }, { status: 500 });
  }
}
