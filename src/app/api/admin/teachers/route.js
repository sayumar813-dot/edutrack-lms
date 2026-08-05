import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// GET /api/admin/teachers - List all teachers
export async function GET(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const teachers = await Teacher.find()
      .populate('userId', 'name email role createdAt')
      .populate('subjectsAssigned', 'name classId');

    return Response.json({ success: true, teachers });
  } catch (error) {
    console.error('List teachers error:', error);
    return Response.json({ error: 'Server error listing teachers.' }, { status: 500 });
  }
}

// POST /api/admin/teachers - Create a new teacher
export async function POST(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { name, email, phone, subjectIds, password } = await req.json();

    if (!name || !email) {
      return Response.json(
        { error: 'Name and email are required.' },
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
      role: 'teacher',
      mustResetPassword: false,
    });

    // Create Teacher profile
    const newTeacher = await Teacher.create({
      userId: newUser._id,
      phone: phone || '',
      subjectsAssigned: subjectIds || [],
    });

    return Response.json({
      success: true,
      message: 'Teacher created successfully.',
      teacher: newTeacher,
      tempPassword: finalPassword,
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return Response.json({ error: 'Server error creating teacher.' }, { status: 500 });
  }
}

// DELETE /api/admin/teachers?id=... - Delete/Revoke teacher account
export async function DELETE(req) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('id');

    if (!teacherId) {
      return Response.json({ error: 'Teacher ID parameter is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return Response.json({ error: 'Teacher profile not found.' }, { status: 404 });
    }

    // Unassign teacher from classes
    await Class.updateMany({ teacherId: teacher._id }, { $set: { teacherId: null } });

    // Delete User record (triggers immediate session revocation)
    await User.findByIdAndDelete(teacher.userId);
    await Teacher.findByIdAndDelete(teacher._id);

    return Response.json({
      success: true,
      message: 'Teacher account deleted. Immediate access revoked.',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return Response.json({ error: 'Server error deleting teacher account.' }, { status: 500 });
  }
}
