import { createAdminClient } from '@/lib/supabase/server';

export interface EmitAlertParams {
  eventType: string;
  title: string;
  message: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetUserId?: string | null;
  targetRole?: 'PARENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'ALL';
  relatedEntity?: string;
  relatedEntityId?: string;
  deduplicationKey?: string;
}

export class AlertService {
  /**
   * Emit an alert with deduplication protection.
   */
  static async emitAlert(params: EmitAlertParams) {
    try {
      const supabase = createAdminClient();
      const severity = params.severity || 'MEDIUM';
      const dedupKey = params.deduplicationKey || `${params.eventType}_${params.targetUserId || params.targetRole}_${params.relatedEntityId || 'gen'}`;

      // Check if active or escalated alert with same deduplication key exists
      const { data: existing } = await supabase
        .from('alerts')
        .select('id, escalation_level')
        .eq('deduplication_key', dedupKey)
        .in('status', ['ACTIVE', 'ESCALATED'])
        .maybeSingle();

      if (existing) {
        // Update timestamp of existing alert rather than spamming duplicate
        await supabase
          .from('alerts')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        return existing;
      }

      // Insert new alert
      const { data: newAlert, error } = await supabase
        .from('alerts')
        .insert({
          event_type: params.eventType,
          title: params.title,
          message: params.message,
          severity,
          target_user_id: params.targetUserId || null,
          target_role: params.targetRole || 'ADMIN',
          related_entity: params.relatedEntity || null,
          related_entity_id: params.relatedEntityId || null,
          status: 'ACTIVE',
          escalation_level: 1,
          deduplication_key: dedupKey,
        })
        .select()
        .single();

      if (error) {
        console.warn('Alert emission warning (schema may need SQL migration):', error.message);
      }
      return newAlert;
    } catch (err: any) {
      console.error('AlertService emitAlert error:', err.message);
      return null;
    }
  }

  /**
   * Trigger automation rules for an event type (e.g. STUDENT_ABSENCE, REPEATED_ABSENCE, GRADE_DROP).
   */
  static async processEvent(eventType: string, context: { title: string; message: string; entityId?: string; userId?: string; extra?: any }) {
    try {
      const supabase = createAdminClient();

      // Fetch rule config
      const { data: rule } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_enabled', true)
        .maybeSingle();

      const severity = rule?.severity || 'MEDIUM';

      // 1. Notify Parent
      if (rule?.notify_parent || eventType === 'STUDENT_ABSENCE' || eventType === 'REPEATED_ABSENCE') {
        await this.emitAlert({
          eventType,
          title: context.title,
          message: context.message,
          severity,
          targetUserId: context.userId,
          targetRole: 'PARENT',
          relatedEntity: 'student',
          relatedEntityId: context.entityId,
          deduplicationKey: `PARENT_${eventType}_${context.entityId}_${new Date().toISOString().split('T')[0]}`,
        });
      }

      // 2. Notify Teacher
      if (rule?.notify_teacher || eventType === 'STUDENT_ABSENCE' || eventType === 'GRADE_DROP') {
        await this.emitAlert({
          eventType,
          title: context.title,
          message: context.message,
          severity,
          targetRole: 'TEACHER',
          relatedEntity: 'class',
          relatedEntityId: context.entityId,
          deduplicationKey: `TEACHER_${eventType}_${context.entityId}_${new Date().toISOString().split('T')[0]}`,
        });
      }

      // 3. Notify Admin / Super Admin
      if (rule?.notify_admin || rule?.notify_super_admin || eventType === 'REPEATED_ABSENCE' || eventType === 'STUDENT_INCIDENT' || eventType === 'FACILITY_ISSUE') {
        await this.emitAlert({
          eventType,
          title: context.title,
          message: context.message,
          severity: eventType === 'STUDENT_INCIDENT' ? 'CRITICAL' : severity,
          targetRole: rule?.notify_super_admin ? 'SUPER_ADMIN' : 'ADMIN',
          relatedEntity: 'school',
          relatedEntityId: context.entityId,
          deduplicationKey: `ADMIN_${eventType}_${context.entityId}_${new Date().toISOString().split('T')[0]}`,
        });
      }
    } catch (err: any) {
      console.error('AlertService processEvent error:', err.message);
    }
  }

  /**
   * Acknowledge an alert (Level 1 / Level 2 / Level 3 action).
   */
  static async acknowledgeAlert(alertId: string, actorUserId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledged_by: actorUserId,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Resolve an alert.
   */
  static async resolveAlert(alertId: string, actorUserId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: 'RESOLVED',
        resolved_by: actorUserId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Time-based Escalation Job: Escalates ACTIVE unacknowledged alerts older than configured hours.
   */
  static async runEscalationCheck() {
    try {
      const supabase = createAdminClient();

      // Fetch active alerts
      const { data: activeAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'ACTIVE')
        .lt('escalation_level', 3);

      if (!activeAlerts || activeAlerts.length === 0) {
        return { escalatedCount: 0 };
      }

      let count = 0;
      const now = Date.now();

      for (const alert of activeAlerts) {
        // Fetch rule for escalation threshold
        const { data: rule } = await supabase
          .from('notification_rules')
          .select('escalate_after_hours')
          .eq('event_type', alert.event_type)
          .maybeSingle();

        const maxHours = rule?.escalate_after_hours || 24;
        const alertAgeHours = (now - new Date(alert.created_at || alert.updated_at).getTime()) / (1000 * 60 * 60);

        if (alertAgeHours >= maxHours) {
          const nextLevel = Math.min(3, (alert.escalation_level || 1) + 1);
          const nextRole = nextLevel === 3 ? 'SUPER_ADMIN' : 'ADMIN';

          await supabase
            .from('alerts')
            .update({
              escalation_level: nextLevel,
              target_role: nextRole,
              status: 'ESCALATED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', alert.id);

          count++;
        }
      }

      return { escalatedCount: count };
    } catch (err: any) {
      console.error('Run escalation check error:', err.message);
      return { error: err.message, escalatedCount: 0 };
    }
  }
}
