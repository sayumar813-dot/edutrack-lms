import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import Class from '@/models/Class';
import Subject from '@/models/Subject';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';

// GET /api/admin/classes - List classes with populated teacher and subjects list
export async function GET(req) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher', 'student']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    let classQuery = {};

    // Teacher scoping: Find all classes where this teacher teaches AT LEAST ONE subject
    // This supports multi-teacher classes (each subject has its own teacher)
    if (session.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ success: true, classes: [] });
      }
      // Find all subjects taught by this teacher → get unique classIds
      const taughtSubjects = await Subject.find({ teacherId: teacherProfile._id }).select('classId');
      const classIds = [...new Set(taughtSubjects.map(s => s.classId.toString()))];
      if (classIds.length === 0) {
        return Response.json({ success: true, classes: [] });
      }
      classQuery = { _id: { $in: classIds } };
    }

    // Student scoping: View own enrolled class only
    if (session.role === 'student') {
      const studentProfile = await Student.findOne({ userId: session.userId });
      if (!studentProfile || !studentProfile.classId) {
        return Response.json({ success: true, classes: [] });
      }
      classQuery = { _id: studentProfile.classId };
    }

    const classesList = await Class.find(classQuery)
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: -1 });

    // Fetch subjects for each class to show all subjects belonging to a class
    const classesWithSubjects = await Promise.all(
      classesList.map(async (c) => {
        const classObj = c.toObject();
        const subjects = await Subject.find({ classId: c._id }).select('name');
        classObj.subjects = subjects.map(s => s.name);
        return classObj;
      })
    );

    return Response.json({ success: true, classes: classesWithSubjects });
  } catch (error) {
    console.error('List classes error:', error);
    return Response.json({ error: 'Server error listing classes.' }, { status: 500 });
  }
}

// POST /api/admin/classes - Create new class (Admin only)
export async function POST(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, teacherId } = await req.json();

    if (!name) {
      return Response.json({ error: 'Class name is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const newClass = await Class.create({
      name: name.trim(),
      teacherId: teacherId || null,
    });

    return Response.json({
      success: true,
      message: 'Class created successfully.',
      class: newClass,
    });
  } catch (error) {
    console.error('Create class error:', error);
    return Response.json({ error: 'Server error creating class.' }, { status: 500 });
  }
}

// PUT /api/admin/classes - Edit existing class (Admin only)
export async function PUT(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { id, name, teacherId } = await req.json();

    if (!id || !name) {
      return Response.json({ error: 'Class ID and Name are required.' }, { status: 400 });
    }

    await connectToDatabase();
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        teacherId: teacherId || null,
      },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return Response.json({ error: 'Class not found.' }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: 'Class updated successfully.',
      class: updatedClass,
    });
  } catch (error) {
    console.error('Edit class error:', error);
    return Response.json({ error: 'Server error updating class.' }, { status: 500 });
  }
}

// DELETE /api/admin/classes?id=... - Delete class (Admin only)
export async function DELETE(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return Response.json({ error: 'Class ID parameter is required.' }, { status: 400 });
    }

    await connectToDatabase();
    await Class.findByIdAndDelete(classId);
    // Unassign subjects from deleted class
    await Subject.deleteMany({ classId });

    return Response.json({
      success: true,
      message: 'Class deleted successfully.',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return Response.json({ error: 'Server error deleting class.' }, { status: 500 });
  }
}
