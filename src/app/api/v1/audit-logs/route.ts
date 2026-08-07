import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: dbLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    let logs: any[] = [];

    if (!error && dbLogs && dbLogs.length > 0) {
      logs = dbLogs.map((l: any) => ({
        id: l.id,
        ts: l.created_at ? new Date(l.created_at).toISOString().replace('T', ' ').slice(0, 16) : 'Just now',
        user: l.user_id || 'Admin',
        role: 'Admin',
        action: l.action || 'UPDATE',
        resource: `${l.entity || 'Resource'} — ${l.entity_id || 'System'}`,
        ip: '192.168.1.2',
        ok: true,
      }));
    }

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
