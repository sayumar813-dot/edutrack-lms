import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'teacher', 'student', 'parent'] },
  mustResetPassword: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function verifyAllDemoUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    const passwordHash = await bcrypt.hash('Demo@12345', 10);

    const demoUsers = [
      { name: 'System Administrator', email: 'admin@demo.edutrack.com', role: 'admin' },
      { name: 'Super Admin', email: 'admin@edu.pk', role: 'admin' },
      { name: 'Dr. Sarah Jenkins', email: 'teacher@demo.edutrack.com', role: 'teacher' },
      { name: 'Lead Instructor', email: 'teacher@edu.pk', role: 'teacher' },
      { name: 'Alice Johnson', email: 'student@demo.edutrack.com', role: 'student' },
      { name: 'Alice Johnson', email: 'student@edu.pk', role: 'student' },
      { name: 'Parent Guardian (Demo)', email: 'parent@demo.edutrack.com', role: 'parent' },
      { name: 'Parent Guardian', email: 'parent@edu.pk', role: 'parent' },
    ];

    console.log('--- VERIFYING ALL DEMO ACCOUNTS IN DATABASE ---');
    for (const d of demoUsers) {
      let u = await User.findOne({ email: d.email });
      if (!u) {
        u = await User.create({ name: d.name, email: d.email, passwordHash, role: d.role, mustResetPassword: false });
        console.log(`✅ Created: ${d.email} [Role: ${d.role}]`);
      } else {
        u.passwordHash = passwordHash;
        u.role = d.role;
        u.mustResetPassword = false;
        u.failedLoginAttempts = 0;
        u.lockedUntil = null;
        await u.save();
        console.log(`✓ Verified: ${d.email} [Role: ${d.role}]`);
      }
    }
    console.log('--- ALL ACCOUNTS READY WITH PASSWORD: Demo@12345 ---');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verifyAllDemoUsers();
