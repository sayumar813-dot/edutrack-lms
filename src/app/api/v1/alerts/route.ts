import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';
import { AlertService } from '@/services/alert.service';

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

    let query = supabase
      .from('alerts')
      .select(`
        id, event_type, title, message, severity, target_role, target_user_id,
        related_entity, related_entity_id, status, escalation_level,
        acknowledged_by, acknowledged_at, resolved_by, resolved_at,
        created_at, updated_at
      `)
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

    if (error) {
      console.warn('Fetch alerts query note:', error.message);
      return NextResponse.json({ success: true, alerts: [], stats: { total: 0, active: 0, escalated: 0, acknowledged: 0, resolved: 0 } });
    }

    const formattedAlerts = (alerts || []).map((a: any) => ({
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

    const stats = {
      total: formattedAlerts.length,
      active: formattedAlerts.filter((a: any) => a.status === 'ACTIVE').length,
      escalated: formattedAlerts.filter((a: any) => a.status === 'ESCALATED').length,
      acknowledged: formattedAlerts.filter((a: any) => a.status === 'ACKNOWLEDGED').length,
      resolved: formattedAlerts.filter((a: any) => a.status === 'RESOLVED').length,
    };

    return NextResponse.json({ success: true, alerts: formattedAlerts, stats });
  } catch (error: any) {
    console.error('List alerts error:', error);
    return NextResponse.json({ error: 'Server error listing alerts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { eventType, title, message, severity, targetRole, entityId } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }

    const sessionUser = user as any;
    const rolesArray: string[] = sessionUser?.roles || [];
    const isSuper = rolesArray.includes('SUPER_ADMIN') || sessionUser?.role === 'super_admin';

    const event = eventType || 'STUDENT_INCIDENT';
    const alert = await AlertService.emitAlert({
      eventType: event,
      title: title.trim(),
      message: message.trim(),
      severity: severity || 'HIGH',
      targetRole: targetRole || (isSuper ? 'SUPER_ADMIN' : 'ADMIN'),
      relatedEntityId: entityId || null,
      deduplicationKey: `MANUAL_${event}_${Date.now()}`,
    });

    return NextResponse.json({ success: true, message: 'Alert reported successfully.', alert });
  } catch (error: any) {
    console.error('Post alert error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating alert.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin', 'teacher']);
  if (errorResponse) return errorResponse;

  try {
    const { alertId, action } = await req.json(); // action = 'ACKNOWLEDGE' | 'RESOLVE'

    if (!alertId || !action) {
      return NextResponse.json({ error: 'alertId and action are required.' }, { status: 400 });
    }

    const sessionUser = user as any;
    const actorId: string = (sessionUser?.userId || sessionUser?.id || 'admin') as string;

    let updatedAlert;
    if (action === 'ACKNOWLEDGE') {
      updatedAlert = await AlertService.acknowledgeAlert(alertId, actorId);
    } else if (action === 'RESOLVE') {
      updatedAlert = await AlertService.resolveAlert(alertId, actorId);
    } else {
      return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Alert marked as ${action}D.`, alert: updatedAlert });
  } catch (error: any) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: error.message || 'Server error updating alert.' }, { status: 500 });
  }
}
