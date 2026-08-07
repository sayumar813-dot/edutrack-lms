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
  email: String,
  password: String,
  role: String,
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    const hashedPassword = await bcrypt.hash('mubashir7661', 12);

    // Update existing admin@edutrack.com or create if not exists
    const result = await User.findOneAndUpdate(
      { email: 'admin@edutrack.com' },
      {
        $set: {
          name: 'Admin',
          email: 'admin@edutrack.com',
          password: hashedPassword,
          role: 'admin',
        },
      },
      { upsert: true, new: true }
    );

    console.log('✅ Admin credentials updated successfully!');
    console.log(`   Email:    admin@edutrack.com`);
    console.log(`   Password: mubashir7661`);
    console.log(`   Role:     admin`);
    console.log(`   DB ID:    ${result._id}`);

    // Remove other demo admin accounts to avoid confusion
    const removed = await User.deleteMany({
      role: 'admin',
      email: { $ne: 'admin@edutrack.com' },
    });
    if (removed.deletedCount > 0) {
      console.log(`\n🗑️  Removed ${removed.deletedCount} other admin account(s) to keep only admin@edutrack.com`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateAdmin();
