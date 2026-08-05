import { authenticateRequest } from '@/lib/auth-middleware';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Teacher from '@/models/Teacher';
import Class from '@/models/Class';
import Subject from '@/models/Subject';
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

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    // Determine password: use custom password if provided, or generate random password
    const tempPassword = password && password.trim() ? password.trim() : `Teach_${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create Base User
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'teacher',
      mustResetPassword: false,
    });

    // Create Teacher Profile
    const newTeacher = await Teacher.create({
      userId: newUser._id,
      phone: phone ? phone.trim() : '',
      subjectsAssigned: subjectIds || [],
    });

    return Response.json({
      success: true,
      message: 'Teacher created successfully.',
      teacher: newTeacher,
      tempPassword,
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return Response.json({ error: 'Server error creating teacher.' }, { status: 500 });
  }
}

// DELETE /api/admin/teachers?id=... - Remove teacher account & immediate session revocation
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

    const teacherProfile = await Teacher.findById(teacherId);
    if (!teacherProfile) {
      return Response.json({ error: 'Teacher profile not found.' }, { status: 404 });
    }

    // Delete base User account (triggers immediate 401 session revocation in auth-middleware)
    await User.findByIdAndDelete(teacherProfile.userId);

    // Delete Teacher Profile
    await Teacher.findByIdAndDelete(teacherId);

    // Unassign teacher from any classes
    await Class.updateMany({ teacherId }, { $set: { teacherId: null } });

    return Response.json({
      success: true,
      message: 'Teacher account deleted. Immediate access revoked.',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return Response.json({ error: 'Server error removing teacher.' }, { status: 500 });
  }
}
