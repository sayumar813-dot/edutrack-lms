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
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignIn() {
  console.log('Testing Supabase signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@edutrack.com',
    password: 'mubashir7661',
  });

  if (error) {
    console.error('❌ Sign in failed:', error.message);
  } else {
    console.log('🎉 SIGN IN SUCCESSFUL!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:  ', data.user.email);
    console.log('   Metadata:', data.user.user_metadata);
    console.log('   Session Token (JWT):', data.session.access_token.substring(0, 30) + '...');
  }
}

testSignIn();
