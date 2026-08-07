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
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
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

async function seedParents() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB!\n');

    const passwordHash = await bcrypt.hash('Demo@12345', 10);

    const parentAccounts = [
      { name: 'Parent Guardian (Demo)', email: 'parent@demo.edutrack.com' },
      { name: 'Parent Guardian', email: 'parent@edu.pk' },
    ];

    for (const acc of parentAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = await User.create({
          name: acc.name,
          email: acc.email,
          passwordHash,
          role: 'parent',
          mustResetPassword: false,
        });
        console.log(`✅ Created Parent account: ${acc.email}`);
      } else {
        user.passwordHash = passwordHash;
        user.role = 'parent';
        user.mustResetPassword = false;
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await user.save();
        console.log(`🔄 Updated Parent account: ${acc.email}`);
      }
    }

    console.log('\n🎉 Parent logins verified and ready in database!');
    console.log('Email: parent@demo.edutrack.com OR parent@edu.pk');
    console.log('Password: Demo@12345');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding parent:', error);
    process.exit(1);
  }
}

seedParents();
