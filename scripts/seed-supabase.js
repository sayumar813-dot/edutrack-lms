import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedSupabase() {
  try {
    console.log('🚀 Connecting to Supabase...');

    // 1. Ensure Active Academic Session
    const { data: existingSession } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('is_current', true)
      .single();

    let sessionId = existingSession?.id;

    if (!sessionId) {
      const { data: newSession, error: sessionErr } = await supabase
        .from('academic_sessions')
        .insert({
          name: '2025-2026 Academic Year',
          start_date: '2025-09-01',
          end_date: '2026-06-30',
          is_current: true,
        })
        .select()
        .single();

      if (sessionErr) {
        console.warn('Warning creating academic session:', sessionErr.message);
      } else {
        sessionId = newSession.id;
        console.log('✅ Created active academic session:', sessionId);
      }
    } else {
      console.log('✅ Active academic session found:', sessionId);
    }

    // 2. Hash Password for Admin
    const passwordHash = await bcrypt.hash('mubashir7661', 12);

    // 3. Upsert Super Admin User Profile in Supabase
    const { data: adminUser, error: adminErr } = await supabase
      .from('user_profiles')
      .upsert(
        {
          email: 'admin@edutrack.com',
          first_name: 'System',
          last_name: 'Admin',
          roles: ['ADMIN'],
          role: 'admin',
          password_hash: passwordHash,
          must_reset_password: false,
          failed_login_attempts: 0,
          locked_until: null,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (adminErr) {
      console.error('❌ Error seeding Super Admin:', adminErr);
    } else {
      console.log('✅ Super Admin seeded in Supabase!');
      console.log(`   Email:    admin@edutrack.com`);
      console.log(`   Password: mubashir7661`);
      console.log(`   ID:       ${adminUser.id}`);
    }

    // 4. Seed Default Classes & Subjects if needed
    await supabase.from('classes').upsert([
      { name: 'Grade 10 - Section A', section: 'A', room_number: '101' },
      { name: 'Grade 10 - Section B', section: 'B', room_number: '102' },
      { name: 'Grade 11 - Science', section: 'A', room_number: '201' },
    ], { onConflict: 'name' });

    await supabase.from('subjects').upsert([
      { name: 'Mathematics', code: 'MATH101' },
      { name: 'Physics', code: 'PHY101' },
      { name: 'Chemistry', code: 'CHEM101' },
      { name: 'English Literature', code: 'ENG101' },
    ], { onConflict: 'name' });

    console.log('✅ Seeded default classes & subjects in Supabase!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedSupabase();
