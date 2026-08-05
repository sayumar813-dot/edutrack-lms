/**
 * DEMO DATA SEED SCRIPT
 * ---------------------
 * Adds sample teachers, students, classes, subjects, and 14 days of
 * attendance records to MongoDB Atlas so the Admin dashboard graphs
 * show real visualisations.
 *
 * Run:  node scripts/seed-demo.js
 * Wipe: node scripts/seed-demo.js --wipe
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Fix Windows SRV DNS for mongodb+srv://
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutrack';
const WIPE_MODE = process.argv.includes('--wipe');

// ── Inline Schemas (mirrors src/models) ─────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'teacher', 'student'] },
  mustResetPassword: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const TeacherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: { type: String, default: '' },
  subjectsAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  createdAt: { type: Date, default: Date.now },
});

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  createdAt: { type: Date, default: Date.now },
});

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  createdAt: { type: Date, default: Date.now },
});

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  rollNo: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  guardianPhone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const AttendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: String, required: true, index: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  records: [{ studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, status: { type: String, enum: ['present', 'absent', 'late'] }, _id: false }],
  createdAt: { type: Date, default: Date.now },
});

// Register models safely
const User     = mongoose.models.User     || mongoose.model('User', UserSchema);
const Teacher  = mongoose.models.Teacher  || mongoose.model('Teacher', TeacherSchema);
const Class    = mongoose.models.Class    || mongoose.model('Class', ClassSchema);
const Subject  = mongoose.models.Subject  || mongoose.model('Subject', SubjectSchema);
const Student  = mongoose.models.Student  || mongoose.model('Student', StudentSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomStatus(weights = { present: 70, late: 15, absent: 15 }) {
  const r = Math.random() * 100;
  if (r < weights.present) return 'present';
  if (r < weights.present + weights.late) return 'late';
  return 'absent';
}

// Last N days in YYYY-MM-DD format
function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ── Main Seed ────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 EduTrack Demo Data Seeder');
  console.log('────────────────────────────');
  console.log(`Mode: ${WIPE_MODE ? '🗑️  WIPE demo data' : '➕  ADD demo data'}`);
  console.log('Connecting to MongoDB Atlas…\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected!\n');

  // ── WIPE MODE ─────────────────────────────────────────────────────────────
  if (WIPE_MODE) {
    // Only delete users with the DEMO tag in their email
    const demoUsers = await User.find({ email: /@demo\.edutrack\.com$/ });
    const demoUserIds = demoUsers.map(u => u._id);
    
    const demoTeachers = await Teacher.find({ userId: { $in: demoUserIds } });
    const demoTeacherIds = demoTeachers.map(t => t._id);
    
    const demoStudents = await Student.find({ userId: { $in: demoUserIds } });
    const demoStudentIds = demoStudents.map(s => s._id);

    const demoClasses = await Class.find({ name: /^\[DEMO\]/ });
    const demoClassIds = demoClasses.map(c => c._id);

    const delAttendance = await Attendance.deleteMany({ classId: { $in: demoClassIds } });
    const delSubjects   = await Subject.deleteMany({ classId: { $in: demoClassIds } });
    const delStudents   = await Student.deleteMany({ _id: { $in: demoStudentIds } });
    const delTeachers   = await Teacher.deleteMany({ _id: { $in: demoTeacherIds } });
    const delUsers      = await User.deleteMany({ _id: { $in: demoUserIds } });
    const delClasses    = await Class.deleteMany({ _id: { $in: demoClassIds } });

    console.log(`🗑️  Wiped demo data:`);
    console.log(`   Classes:    ${delClasses.deletedCount}`);
    console.log(`   Subjects:   ${delSubjects.deletedCount}`);
    console.log(`   Teachers:   ${delTeachers.deletedCount}`);
    console.log(`   Students:   ${delStudents.deletedCount}`);
    console.log(`   Attendance: ${delAttendance.deletedCount}`);
    console.log(`   Users:      ${delUsers.deletedCount}`);
    console.log('\n✅ All demo data removed. Real data is untouched.\n');
    process.exit(0);
  }

  // ── GET ADMIN USER (for markedBy field) ───────────────────────────────────
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.error('❌ No admin user found. Run: node scripts/seed-admin.js first');
    process.exit(1);
  }

  const defaultPassword = await bcrypt.hash('Demo@12345', 10);

  // ── CREATE CLASSES ────────────────────────────────────────────────────────
  console.log('📚 Creating demo classes…');
  const classData = [
    '[DEMO] Grade 9 - Alpha',
    '[DEMO] Grade 10 - Beta',
    '[DEMO] Grade 11 - Gamma',
  ];

  const createdClasses = [];
  for (const name of classData) {
    const existing = await Class.findOne({ name });
    if (existing) {
      createdClasses.push(existing);
      console.log(`   ↳ Skipped (already exists): ${name}`);
    } else {
      const cls = await Class.create({ name });
      createdClasses.push(cls);
      console.log(`   ✅ Created: ${name}`);
    }
  }

  // ── CREATE SUBJECTS ───────────────────────────────────────────────────────
  console.log('\n📖 Creating demo subjects…');
  const subjectNames = ['Mathematics', 'Physics', 'English', 'Computer Science', 'Urdu'];
  const createdSubjects = {};

  for (const cls of createdClasses) {
    createdSubjects[cls._id] = [];
    for (const subName of subjectNames) {
      const fullName = `${subName}`;
      const existing = await Subject.findOne({ name: fullName, classId: cls._id });
      if (existing) {
        createdSubjects[cls._id].push(existing);
        console.log(`   ↳ Skipped: ${cls.name} → ${fullName}`);
      } else {
        const sub = await Subject.create({ name: fullName, classId: cls._id });
        createdSubjects[cls._id].push(sub);
        console.log(`   ✅ ${cls.name} → ${fullName}`);
      }
    }
  }

  // ── CREATE TEACHERS ───────────────────────────────────────────────────────
  console.log('\n👨‍🏫 Creating demo teachers…');
  const teacherData = [
    { name: 'Ali Hassan', email: 'ali.hassan@demo.edutrack.com', phone: '0300-1234567' },
    { name: 'Sara Malik', email: 'sara.malik@demo.edutrack.com', phone: '0321-9876543' },
    { name: 'Usman Khan', email: 'usman.khan@demo.edutrack.com', phone: '0333-5556666' },
  ];

  const createdTeachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const td = teacherData[i];
    let user = await User.findOne({ email: td.email });
    if (!user) {
      user = await User.create({ name: td.name, email: td.email, passwordHash: defaultPassword, role: 'teacher', mustResetPassword: false });
    }
    let teacher = await Teacher.findOne({ userId: user._id });
    if (!teacher) {
      teacher = await Teacher.create({ userId: user._id, phone: td.phone });
    }
    createdTeachers.push(teacher);

    // Assign teacher to their class
    const cls = createdClasses[i % createdClasses.length];
    await Class.findByIdAndUpdate(cls._id, { teacherId: teacher._id });

    // Assign ALL subjects of that class to the teacher
    const classSubjects = createdSubjects[cls._id] || [];
    const subjectIds = classSubjects.map(s => s._id);

    // Update teacher's subjectsAssigned array
    await Teacher.findByIdAndUpdate(teacher._id, { subjectsAssigned: subjectIds });

    // Link each subject back to this teacher
    await Subject.updateMany({ _id: { $in: subjectIds } }, { teacherId: teacher._id });

    console.log(`   ✅ ${td.name} → ${cls.name} (${classSubjects.length} subjects assigned)`);
  }

  // ── CREATE STUDENTS ───────────────────────────────────────────────────────
  console.log('\n🎓 Creating demo students…');
  const firstNames = ['Ahmed', 'Fatima', 'Hassan', 'Ayesha', 'Bilal', 'Zainab', 'Omar', 'Nida', 'Raza', 'Saba'];
  const lastNames  = ['Malik', 'Sheikh', 'Raza', 'Butt', 'Khan', 'Qureshi', 'Akhtar', 'Siddiqui'];
  const createdStudents = {};

  for (let cIdx = 0; cIdx < createdClasses.length; cIdx++) {
    const cls = createdClasses[cIdx];
    createdStudents[cls._id] = [];
    for (let i = 1; i <= 8; i++) {
      const fnIdx = (cIdx * 8 + i - 1) % firstNames.length;
      const lnIdx = (cIdx * 8 + i - 1) % lastNames.length;
      const firstName = firstNames[fnIdx];
      const lastName  = lastNames[lnIdx];
      const name  = `${firstName} ${lastName}`;

      // Guarantee unique email per student across all classes
      // Primary demo student account is student@demo.edutrack.com
      const email = (cIdx === 0 && i === 1)
        ? 'student@demo.edutrack.com'
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${cIdx + 1}${i}@demo.edutrack.com`;

      const rollNo = `${cls.name.replace(/[^A-Z0-9]/gi, '').slice(-3).toUpperCase()}-${String(i).padStart(3, '0')}`;

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name, email, passwordHash: defaultPassword, role: 'student', mustResetPassword: false });
      } else {
        // Ensure role is student and password is set to defaultPassword
        user.role = 'student';
        user.passwordHash = defaultPassword;
        await user.save();
      }

      let student = await Student.findOne({ userId: user._id });
      if (!student) {
        student = await Student.create({ userId: user._id, rollNo, classId: cls._id, guardianPhone: '0300-0000000' });
      } else {
        student.classId = cls._id;
        await student.save();
      }
      createdStudents[cls._id].push(student);
    }
    console.log(`   ✅ ${createdStudents[cls._id].length} students enrolled in ${cls.name}`);
  }

  // ── CREATE ATTENDANCE RECORDS (Last 14 Days) ──────────────────────────────
  console.log('\n📝 Generating 14 days of attendance records…');
  const attendanceDays = lastNDays(14);
  let totalAttendanceRecords = 0;

  for (const cls of createdClasses) {
    const classSubjects = createdSubjects[cls._id] || [];
    const classStudents = createdStudents[cls._id] || [];
    if (classStudents.length === 0 || classSubjects.length === 0) continue;

    for (const day of attendanceDays) {
      // Skip weekends (Saturday=6, Sunday=0)
      const dayOfWeek = new Date(day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (const subject of classSubjects) {
        const existingRecord = await Attendance.findOne({ classId: cls._id, subjectId: subject._id, date: day });
        if (existingRecord) continue;

        // Generate weighted random statuses
        const records = classStudents.map(st => ({
          studentId: st._id,
          status: randomStatus({ present: 78, late: 10, absent: 12 }),
        }));

        await Attendance.create({
          classId: cls._id,
          subjectId: subject._id,
          date: day,
          markedBy: adminUser._id,
          records,
        });

        totalAttendanceRecords++;
      }
    }
    console.log(`   ✅ ${cls.name}: attendance for all 14 days`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n🎉 Demo Data Seeded Successfully!');
  console.log('══════════════════════════════════════════');
  console.log(`   Classes Created:     ${createdClasses.length}`);
  console.log(`   Total Subjects:      ${Object.values(createdSubjects).flat().length}`);
  console.log(`   Teachers Created:    ${createdTeachers.length}`);
  const totalStudents = Object.values(createdStudents).flat().length;
  console.log(`   Students Created:    ${totalStudents}`);
  console.log(`   Attendance Batches:  ${totalAttendanceRecords} (14 days × classes × subjects)`);
  console.log('══════════════════════════════════════════');
  console.log('\n🔑 Demo Account Login Passwords: Demo@12345');
  console.log('\n📊 Refresh your Admin Dashboard to see live charts!');
  console.log('\n🗑️  To remove all demo data later, run:');
  console.log('   node scripts/seed-demo.js --wipe\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed error:', err.message || err);
  process.exit(1);
});
