import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutrack';

const UserSchema = new mongoose.Schema({ email: String, role: String });
const TeacherSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
const StudentSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
const ClassSchema = new mongoose.Schema({ name: String });
const SubjectSchema = new mongoose.Schema({ name: String });
const AttendanceSchema = new mongoose.Schema({ classId: mongoose.Schema.Types.ObjectId });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);
const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

async function wipeAllDemoData() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas!\n');

    console.log('🗑️ Wiping all demo data (classes, students, teachers, subjects, attendance)...');

    // Delete all non-admin users
    const nonAdminUsers = await User.find({ role: { $ne: 'admin' } });
    const nonAdminUserIds = nonAdminUsers.map(u => u._id);

    const delTeachers = await Teacher.deleteMany({ userId: { $in: nonAdminUserIds } });
    const delStudents = await Student.deleteMany({ userId: { $in: nonAdminUserIds } });
    const delUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    const delAttendance = await Attendance.deleteMany({});
    const delSubjects = await Subject.deleteMany({});
    const delClasses = await Class.deleteMany({});

    console.log('\n================ SUMMARY OF CLEANUP ================');
    console.log(`   Deleted Non-Admin Users: ${delUsers.deletedCount}`);
    console.log(`   Deleted Teacher Profiles: ${delTeachers.deletedCount}`);
    console.log(`   Deleted Student Profiles: ${delStudents.deletedCount}`);
    console.log(`   Deleted Class Sections:   ${delClasses.deletedCount}`);
    console.log(`   Deleted Subjects:         ${delSubjects.deletedCount}`);
    console.log(`   Deleted Attendance Logs:  ${delAttendance.deletedCount}`);
    console.log('====================================================');

    const remainingAdmins = await User.find({ role: 'admin' });
    console.log(`\n🎉 Database Cleaned! Preserved ${remainingAdmins.length} Admin account(s):`);
    remainingAdmins.forEach(a => console.log(`   🔑 ${a.email}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Wipe error:', err);
    process.exit(1);
  }
}

wipeAllDemoData();
