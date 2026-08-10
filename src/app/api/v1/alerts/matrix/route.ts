import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();
    const { data: rules, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Notification rules matrix note:', error.message);
      // Return standard default matrix if DB table not yet migrated
      return NextResponse.json({ success: true, rules: defaultRules() });
    }

    return NextResponse.json({ success: true, rules: rules && rules.length > 0 ? rules : defaultRules() });
  } catch (error: any) {
    console.error('Fetch matrix error:', error);
    return NextResponse.json({ success: true, rules: defaultRules() });
  }
}

export async function PUT(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { id, eventType, severity, notifyParent, notifyTeacher, notifyAdmin, notifySuperAdmin, escalationThreshold, escalateAfterHours, isEnabled } = await req.json();

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const payload = {
      event_type: eventType,
      severity: severity || 'MEDIUM',
      notify_parent: Boolean(notifyParent),
      notify_teacher: Boolean(notifyTeacher),
      notify_admin: Boolean(notifyAdmin),
      notify_super_admin: Boolean(notifySuperAdmin),
      escalation_threshold: Number(escalationThreshold || 1),
      escalate_after_hours: Number(escalateAfterHours || 24),
      is_enabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
    };

    let result;
    if (id) {
      const { data, error } = await supabase
        .from('notification_rules')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('notification_rules')
        .upsert(payload, { onConflict: 'event_type' })
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    }

    return NextResponse.json({ success: true, message: 'Notification matrix rule updated.', rule: result });
  } catch (error: any) {
    console.error('Update matrix rule error:', error);
    return NextResponse.json({ error: error.message || 'Server error updating matrix rule.' }, { status: 500 });
  }
}

function defaultRules() {
  return [
    { event_type: 'STUDENT_ABSENCE', severity: 'LOW', notify_parent: true, notify_teacher: true, notify_admin: false, notify_super_admin: false, escalation_threshold: 1, escalate_after_hours: 24, is_enabled: true },
    { event_type: 'REPEATED_ABSENCE', severity: 'HIGH', notify_parent: true, notify_teacher: true, notify_admin: true, notify_super_admin: false, escalation_threshold: 2, escalate_after_hours: 12, is_enabled: true },
    { event_type: 'STUDENT_INCIDENT', severity: 'CRITICAL', notify_parent: true, notify_teacher: true, notify_admin: true, notify_super_admin: true, escalation_threshold: 1, escalate_after_hours: 6, is_enabled: true },
    { event_type: 'GRADE_DROP', severity: 'MEDIUM', notify_parent: false, notify_teacher: true, notify_admin: true, notify_super_admin: false, escalation_threshold: 15, escalate_after_hours: 48, is_enabled: true },
    { event_type: 'MISSING_ASSIGNMENT', severity: 'LOW', notify_parent: false, notify_teacher: true, notify_admin: false, notify_super_admin: false, escalation_threshold: 1, escalate_after_hours: 24, is_enabled: true },
    { event_type: 'CLASS_WORK_ISSUE', severity: 'HIGH', notify_parent: false, notify_teacher: true, notify_admin: true, notify_super_admin: false, escalation_threshold: 30, escalate_after_hours: 24, is_enabled: true },
    { event_type: 'FACILITY_ISSUE', severity: 'MEDIUM', notify_parent: false, notify_teacher: false, notify_admin: true, notify_super_admin: false, escalation_threshold: 1, escalate_after_hours: 24, is_enabled: true },
  ];
}
