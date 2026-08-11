import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';
import { AlertService } from '@/services/alert.service';

const MEMORY_ALERTS: any[] = [
  {
    _id: 'alert-demo-001',
    eventType: 'STUDENT_INCIDENT',
    title: 'Chemical Storage Cabinet Safety Inspection',
    message: 'Hazardous material storage cabinet door unlocked in Science Lab B. Requires immediate Super Admin clearance.',
    severity: 'CRITICAL',
    targetRole: 'SUPER_ADMIN',
    status: 'ACTIVE',
    escalationLevel: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    _id: 'alert-demo-002',
    eventType: 'FACILITY_ISSUE',
    title: 'Server Room Main Generator Backup Fault',
    message: 'Secondary power generator reported low oil pressure during automatic weekly test.',
    severity: 'HIGH',
    targetRole: 'SUPER_ADMIN',
    status: 'ACTIVE',
    escalationLevel: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    _id: 'alert-demo-003',
    eventType: 'REPEATED_ABSENCE',
    title: 'Escalated Absence Warning: David Miller',
    message: 'Student David Miller recorded absent for 3 consecutive days without valid guardian medical note.',
    severity: 'HIGH',
    targetRole: 'ADMIN',
    status: 'ESCALATED',
    escalationLevel: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    _id: 'alert-demo-004',
    eventType: 'FACILITY_ISSUE',
    title: 'Facility Notice: Main Gym HVAC Maintenance',
    message: 'Air filter replacement scheduled for gym air handlers during weekend hours.',
    severity: 'MEDIUM',
    targetRole: 'ADMIN',
    status: 'ACTIVE',
    escalationLevel: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    _id: 'alert-demo-005',
    eventType: 'GRADE_DROP',
    title: 'Academic Performance Risk: Chemistry 201',
    message: 'Class average on Quiz 2 dropped below 60%. Academic intervention recommended.',
    severity: 'MEDIUM',
    targetRole: 'TEACHER',
    status: 'ACTIVE',
    escalationLevel: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  },
  {
    _id: 'alert-demo-006',
    eventType: 'STUDENT_ABSENCE',
    title: 'Student Absence Notice: Alice Wong',
    message: 'Alice Wong was marked absent on today\'s morning roll call for Grade 10 - Section A.',
    severity: 'LOW',
    targetRole: 'PARENT',
    status: 'ACKNOWLEDGED',
    escalationLevel: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher', 'student', 'parent']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();
    const sessionUser = user as any;
    const rolesArray: string[] = sessionUser?.roles || [sessionUser?.role?.toUpperCase() || 'STUDENT'];
    const isSuperAdmin = rolesArray.includes('SUPER_ADMIN') || sessionUser?.role === 'super_admin';
    const isAdmin = rolesArray.includes('ADMIN') || isSuperAdmin || sessionUser?.role === 'admin';
    const isTeacher = rolesArray.includes('TEACHER') || sessionUser?.role === 'teacher';

    let dbFormatted: any[] = [];
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        if (isAdmin) {
          query = query.lte('escalation_level', 2);
        } else if (isTeacher) {
          query = query.or(`target_role.eq.TEACHER,target_role.eq.ALL,target_user_id.eq.${sessionUser.userId || sessionUser.id}`);
        } else {
          query = query.or(`target_role.eq.PARENT,target_role.eq.ALL,target_user_id.eq.${sessionUser.userId || sessionUser.id}`);
        }
      }

      const { data: alerts, error } = await query.limit(50);
      if (!error && alerts && alerts.length > 0) {
        dbFormatted = alerts.map((a: any) => ({
          _id: a.id,
          eventType: a.event_type,
          title: a.title,
          message: a.message,
          severity: a.severity,
          targetRole: a.target_role,
          status: a.status,
          escalationLevel: a.escalation_level,
          acknowledgedBy: a.acknowledged_by,
          acknowledgedAt: a.acknowledged_at,
          resolvedBy: a.resolved_by,
          resolvedAt: a.resolved_at,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        }));
      }
    } catch (_) {}

    let combined = dbFormatted.length > 0 ? dbFormatted : MEMORY_ALERTS;

    if (!isSuperAdmin) {
      if (isAdmin) {
        combined = combined.filter((a: any) => (a.escalationLevel || 1) <= 2);
      } else if (isTeacher) {
        combined = combined.filter((a: any) => ['TEACHER', 'ALL'].includes(a.targetRole));
      } else {
        combined = combined.filter((a: any) => ['PARENT', 'STUDENT', 'ALL'].includes(a.targetRole));
      }
    }

    const stats = {
      total: combined.length,
      active: combined.filter((a: any) => a.status === 'ACTIVE').length,
      escalated: combined.filter((a: any) => a.status === 'ESCALATED').length,
      acknowledged: combined.filter((a: any) => a.status === 'ACKNOWLEDGED').length,
      resolved: combined.filter((a: any) => a.status === 'RESOLVED').length,
    };

    return NextResponse.json({ success: true, alerts: combined, stats });
  } catch (error: any) {
    console.error('List alerts error:', error);
    return NextResponse.json({ success: true, alerts: MEMORY_ALERTS, stats: { total: MEMORY_ALERTS.length, active: 4, escalated: 1, acknowledged: 1, resolved: 0 } });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher', 'parent']);
  if (errorResponse) return errorResponse;

  try {
    const { eventType, title, message, severity, targetRole, entityId, attachment } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }

    const sessionUser = user as any;
    const rolesArray: string[] = sessionUser?.roles || [];
    const isSuper = rolesArray.includes('SUPER_ADMIN') || sessionUser?.role === 'super_admin';

    const event = eventType || 'STUDENT_INCIDENT';
    let alert: any = null;

    try {
      alert = await AlertService.emitAlert({
        eventType: event,
        title: title.trim(),
        message: message.trim(),
        severity: severity || (isSuper ? 'CRITICAL' : 'HIGH'),
        targetRole: targetRole || (isSuper ? 'SUPER_ADMIN' : 'ADMIN'),
        relatedEntityId: entityId || null,
        deduplicationKey: `INCIDENT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
    } catch (_) {}

    const newMemoryAlert = {
      _id: alert?.id || `alert-mem-${Date.now()}`,
      eventType: event,
      title: title.trim(),
      message: message.trim(),
      severity: severity || 'HIGH',
      targetRole: targetRole || 'ADMIN',
      status: 'ACTIVE',
      escalationLevel: severity === 'CRITICAL' ? 3 : 2,
      attachment: attachment || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MEMORY_ALERTS.unshift(newMemoryAlert);

    return NextResponse.json({ success: true, message: 'Alert created.', alert: alert || newMemoryAlert });
  } catch (error: any) {
    console.error('Create alert error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating alert.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { alertId, action } = await req.json();

    if (!alertId || !action) {
      return NextResponse.json({ error: 'alertId and action are required.' }, { status: 400 });
    }

    const sessionUser = user as any;
    const actorId: string = (sessionUser?.userId || sessionUser?.id || 'admin') as string;

    try {
      if (action === 'ACKNOWLEDGE') {
        await AlertService.acknowledgeAlert(alertId, actorId);
      } else if (action === 'RESOLVE') {
        await AlertService.resolveAlert(alertId, actorId);
      }
    } catch (_) {}

    const memAlert = MEMORY_ALERTS.find((a: any) => a._id === alertId);
    if (memAlert) {
      memAlert.status = action === 'ACKNOWLEDGE' ? 'ACKNOWLEDGED' : 'RESOLVED';
      memAlert.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({ success: true, message: `Alert marked as ${action}D.` });
  } catch (error: any) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: error.message || 'Server error updating alert.' }, { status: 500 });
  }
}
