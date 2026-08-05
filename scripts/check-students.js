import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

import path from 'path';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;


async function main() {
  await mongoose.connect(mongoUri);
  const users = await mongoose.connection.collection('users').find({ role: 'student' }).toArray();
  console.log('Students count:', users.length);
  for (const u of users.slice(0, 10)) {
    const validPassword = await bcrypt.compare('Demo@12345', u.passwordHash);
    console.log(`Name: ${u.name} | Email: ${u.email} | Pass Valid: ${validPassword}`);
  }
  process.exit(0);
}
main();
