import { createClient } from '@/lib/supabase/server';

export interface AuditEvent {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: Record<string, any>;
}

export class AuditService {
  /**
   * Asynchronously record an audit log event without blocking the caller's main execution path.
   */
  static log(event: AuditEvent): void {
    setImmediate(async () => {
      try {
        const supabase = await createClient();
        await supabase.from('audit_logs').insert({
          user_id: event.userId,
          action: event.action,
          entity: event.entity,
          entity_id: event.entityId,
          payload: event.payload ?? {},
        });
      } catch (error) {
        console.error('[AuditService Error] Failed to write audit log:', error);
      }
    });
  }
}
