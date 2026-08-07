import { createClient } from '@supabase/supabase-js';
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSupabaseAuth() {
  console.log('Testing Supabase Admin Auth...');
  
  // Check if admin user exists in auth.users
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('List users error:', listErr);
    return;
  }

  let adminUser = users.users.find(u => u.email === 'admin@edutrack.com');

  if (!adminUser) {
    console.log('Creating admin@edutrack.com via Supabase Auth Admin API...');
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: 'admin@edutrack.com',
      password: 'mubashir7661',
      email_confirm: true,
      user_metadata: { first_name: 'System', last_name: 'Admin', role: 'admin' }
    });

    if (createErr) {
      console.error('Create admin error:', createErr);
      return;
    }
    adminUser = newUser.user;
    console.log('✅ Admin user created in auth.users! ID:', adminUser.id);
  } else {
    console.log('✅ Admin user already exists in auth.users! ID:', adminUser.id);
    // Update password
    await supabase.auth.admin.updateUserById(adminUser.id, { password: 'mubashir7661' });
    console.log('✅ Admin password updated to mubashir7661!');
  }

  // Sync to user_profiles table
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .upsert({
      id: adminUser.id,
      email: 'admin@edutrack.com',
      first_name: 'System',
      last_name: 'Admin',
      roles: ['ADMIN']
    }, { onConflict: 'id' })
    .select()
    .single();

  if (profileErr) {
    console.error('Profile upsert error:', profileErr);
  } else {
    console.log('✅ User profile synced to user_profiles table:', profile);
  }
}

testSupabaseAuth();
