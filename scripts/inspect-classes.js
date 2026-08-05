import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

import User from '../src/models/User.js';
import Teacher from '../src/models/Teacher.js';
import Student from '../src/models/Student.js';
import Class from '../src/models/Class.js';
import Subject from '../src/models/Subject.js';
import Attendance from '../src/models/Attendance.js';

async function summary() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== MONGODB ATLAS REAL-TIME DATABASE SUMMARY ===');
  console.log(`Cluster URI: ${process.env.MONGO_URI.split('@')[1].split('/')[0]}`);
  console.log(`Database Name: edutrack`);
  console.log('------------------------------------------------');
  console.log(`Users Collection Count:       ${await User.countDocuments()}`);
  console.log(`Teachers Collection Count:    ${await Teacher.countDocuments()}`);
  console.log(`Students Collection Count:    ${await Student.countDocuments()}`);
  console.log(`Classes Collection Count:     ${await Class.countDocuments()}`);
  console.log(`Subjects Collection Count:    ${await Subject.countDocuments()}`);
  console.log(`Attendances Collection Count: ${await Attendance.countDocuments()}`);
  console.log('------------------------------------------------');
  process.exit(0);
}

summary();
