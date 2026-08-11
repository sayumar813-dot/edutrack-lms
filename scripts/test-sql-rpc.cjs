const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function testRpc() {
  console.log('Testing RPC exec_sql / query_sql...');
  
  // Try exec_sql
  const { data: res1, error: err1 } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('exec_sql res:', res1, 'err:', err1);

  // Try sql
  const { data: res2, error: err2 } = await supabase.rpc('sql', { query: 'SELECT 1;' });
  console.log('sql res:', res2, 'err:', err2);
  
  process.exit(0);
}

testRpc();
