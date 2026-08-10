-- ============================================================================
-- SCHOLARFLOW ERP — SMART ALERT ENGINE & DUAL ADMIN SCHEMA MIGRATION
-- ============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. NOTIFICATION RULES TABLE
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    notify_parent BOOLEAN DEFAULT false,
    notify_teacher BOOLEAN DEFAULT false,
    notify_admin BOOLEAN DEFAULT false,
    notify_super_admin BOOLEAN DEFAULT false,
    escalation_threshold INT DEFAULT 1,
    escalate_after_hours INT DEFAULT 24,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- 3. ALERTS & ESCALATIONS TABLE (With Audit Tracking & Deduplication)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    target_role VARCHAR(50) CHECK (target_role IN ('PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN', 'ALL')),
    related_entity VARCHAR(100),
    related_entity_id UUID,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED')),
    escalation_level INT DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
    deduplication_key VARCHAR(255),
    acknowledged_by UUID REFERENCES public.user_profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.user_profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 4. INDEXES FOR HIGH-THROUGHPUT ALERT QUERIES
CREATE INDEX IF NOT EXISTS idx_alerts_target_role_status ON public.alerts(target_role, status);
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON public.alerts(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_escalation_runner ON public.alerts(status, escalation_level, updated_at);
CREATE INDEX IF NOT EXISTS idx_alerts_dedup ON public.alerts(deduplication_key) WHERE status IN ('ACTIVE', 'ESCALATED');

-- 5. ROW-LEVEL SECURITY POLICIES
DROP POLICY IF EXISTS "Super Admins full access to alerts" ON public.alerts;
CREATE POLICY "Super Admins full access to alerts" ON public.alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND 'SUPER_ADMIN' = ANY(user_profiles.roles)
    )
  );

DROP POLICY IF EXISTS "Admins operational alert access" ON public.alerts;
CREATE POLICY "Admins operational alert access" ON public.alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND ('ADMIN' = ANY(user_profiles.roles) OR 'SUPER_ADMIN' = ANY(user_profiles.roles))
    )
    AND escalation_level <= 2
  );

DROP POLICY IF EXISTS "Teachers and Parents view assigned alerts" ON public.alerts;
CREATE POLICY "Teachers and Parents view assigned alerts" ON public.alerts
  FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_role = 'ALL'
  );

DROP POLICY IF EXISTS "Admins and Super Admins manage rules" ON public.notification_rules;
CREATE POLICY "Admins and Super Admins manage rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND ('ADMIN' = ANY(user_profiles.roles) OR 'SUPER_ADMIN' = ANY(user_profiles.roles))
    )
  );

-- 6. INITIAL DEFAULT NOTIFICATION MATRIX SEED DATA
INSERT INTO public.notification_rules (event_type, severity, notify_parent, notify_teacher, notify_admin, notify_super_admin, escalation_threshold, escalate_after_hours)
VALUES
  ('STUDENT_ABSENCE', 'LOW', true, true, false, false, 1, 24),
  ('REPEATED_ABSENCE', 'HIGH', true, true, true, false, 2, 12),
  ('STUDENT_INCIDENT', 'CRITICAL', true, true, true, true, 1, 6),
  ('GRADE_DROP', 'MEDIUM', false, true, true, false, 15, 48),
  ('MISSING_ASSIGNMENT', 'LOW', false, true, false, false, 1, 24),
  ('CLASS_WORK_ISSUE', 'HIGH', false, true, true, false, 30, 24),
  ('FACILITY_ISSUE', 'MEDIUM', false, false, true, false, 1, 24)
ON CONFLICT (event_type) DO NOTHING;
