import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Fix Windows Node.js SRV DNS lookup issue for mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback if DNS set fails
}

// Parse .env.local file manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutrack';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'teacher', 'student'] },
  mustResetPassword: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB Atlas at:', MONGO_URI.replace(/:([^@]+)@/, ':****@'));
    await mongoose.connect(MONGO_URI);

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`🎉 Admin account already exists in MongoDB Atlas: ${existingAdmin.email}`);
      process.exit(0);
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@edutrack.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';

    console.log(`Seeding initial admin account: ${adminEmail}`);
    const hash = await bcrypt.hash(adminPassword, 10);

    await User.create({
      name: 'Super Admin',
      email: adminEmail.toLowerCase(),
      passwordHash: hash,
      role: 'admin',
      mustResetPassword: false,
    });

    console.log('🎉 Super Admin user created successfully in MongoDB Atlas!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
