import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// GET /api/admin/students - List students with role-based privacy scoping
export async function GET(req) {
  const { user: session, errorResponse } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const classIdFilter = searchParams.get('classId');

    // Teacher Scoping: Only see students enrolled in classes assigned to this teacher
    if (session.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: session.userId });
      if (!teacherProfile) {
        return Response.json({ success: true, students: [] });
      }

      // If a specific classId is requested, filter to that class (within teacher's scope)
      if (classIdFilter) {
        const students = await Student.find({ classId: classIdFilter })
          .populate('userId', 'name email role createdAt')
          .populate('classId', 'name');
        return Response.json({ success: true, students });
      }

      const assignedClasses = await Class.find({ teacherId: teacherProfile._id }).select('_id');
      const classIds = assignedClasses.map(c => c._id);

      const students = await Student.find({ classId: { $in: classIds } })
        .populate('userId', 'name email role createdAt')
        .populate('classId', 'name');

      return Response.json({ success: true, students });
    }

    // Admin Scoping: Full view, with optional classId filter
    const query = classIdFilter ? { classId: classIdFilter } : {};
    const students = await Student.find(query)
      .populate('userId', 'name email role createdAt')
      .populate('classId', 'name');

    return Response.json({ success: true, students });
  } catch (error) {
    console.error('List students error:', error);
    return Response.json({ error: 'Server error listing students.' }, { status: 500 });
  }
}

// POST /api/admin/students - Create a new student (Admin only)
export async function POST(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, email, rollNo, classId, guardianPhone, password } = await req.json();

    if (!name || !email || !rollNo || !classId) {
      return Response.json(
        { error: 'Name, email, roll number, and class ID are required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return Response.json(
        { error: 'A user with this email already exists.' },
        { status: 400 }
      );
    }

    // Use custom password if provided, or generate secure 10-character password
    const finalPassword = password && password.trim() ? password.trim() : crypto.randomBytes(8).toString('hex').slice(0, 10);
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    // Create User record with mustResetPassword: false so they can log in directly and save credentials
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'student',
      mustResetPassword: false,
    });

    // Create Student profile
    const newStudent = await Student.create({
      userId: newUser._id,
      rollNo: rollNo.trim(),
      classId,
      guardianPhone: guardianPhone || '',
    });

    return Response.json({
      success: true,
      message: 'Student created successfully.',
      student: newStudent,
      tempPassword: finalPassword,
    });
  } catch (error) {
    console.error('Create student error:', error);
    return Response.json({ error: 'Server error creating student.' }, { status: 500 });
  }
}

// DELETE /api/admin/students?id=... - Delete/Revoke student account
export async function DELETE(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('id');

    if (!studentId) {
      return Response.json({ error: 'Student ID parameter is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const student = await Student.findById(studentId);
    if (!student) {
      return Response.json({ error: 'Student profile not found.' }, { status: 404 });
    }

    // Delete User record (triggers immediate session revocation)
    await User.findByIdAndDelete(student.userId);
    await Student.findByIdAndDelete(student._id);

    return Response.json({
      success: true,
      message: 'Student account deleted. Immediate access revoked.',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return Response.json({ error: 'Server error deleting student account.' }, { status: 500 });
  }
}
