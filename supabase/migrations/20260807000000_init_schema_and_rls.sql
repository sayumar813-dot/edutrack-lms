-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACADEMIC SESSIONS TABLE
CREATE TABLE public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

-- 2. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    roles TEXT[] DEFAULT ARRAY['STUDENT'],
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. STUDENT PROFILES TABLE
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 4. ATTENDANCE TABLE
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id),
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(student_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 5. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- HIGH-PERFORMANCE SECURITY DEFINER FUNCTIONS (Prevents RLS Subquery Overhead)
--------------------------------------------------------------------------------

-- Helper function to check permissions directly from JWT App Metadata
CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT required_permission = ANY (
    ARRAY(SELECT jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'permissions', '[]'::jsonb)))
  );
$$;

-- Helper function to extract Active Academic Session ID from JWT
CREATE OR REPLACE FUNCTION public.get_active_session_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'academic_session_id')::UUID;
$$;

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
--------------------------------------------------------------------------------

-- ACADEMIC SESSIONS: Read-only for all authenticated users
CREATE POLICY "Read active academic sessions"
ON public.academic_sessions FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- USER PROFILES: Read self or read if user has permission
CREATE POLICY "Read user profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        id = auth.uid() OR public.has_permission('USER:READ')
    )
);

-- STUDENT PROFILES: Isolated by Academic Session & User Identity
CREATE POLICY "Read student profiles for active session"
ON public.student_profiles FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND academic_session_id = public.get_active_session_id()
    AND (
        user_id = auth.uid() OR public.has_permission('STUDENT:READ')
    )
);

-- ATTENDANCE: Isolated by Active Session + Permission Guard
CREATE POLICY "Read attendance for active session"
ON public.attendance FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND academic_session_id = public.get_active_session_id()
    AND (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
        OR public.has_permission('ATTENDANCE:READ')
    )
);

CREATE POLICY "Write attendance for authorized users"
ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (
    academic_session_id = public.get_active_session_id()
    AND public.has_permission('ATTENDANCE:WRITE')
);

-- AUDIT LOGS: Only Admin can Read
CREATE POLICY "Read audit logs for admins"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_permission('AUDIT:READ'));
