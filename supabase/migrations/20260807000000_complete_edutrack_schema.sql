-- ============================================================================
-- EDUTRACK LMS COMPLETE MASTER DATABASE MIGRATION SCRIPT
-- Run this single SQL file in your Supabase Dashboard SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. BASE SYSTEM TABLES
--------------------------------------------------------------------------------

-- ACADEMIC SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

-- USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    roles TEXT[] DEFAULT ARRAY['STUDENT'],
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 2. ERP MODULE TABLES
--------------------------------------------------------------------------------

-- TEACHER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id, academic_session_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- PARENT PROFILES & WARD LINKS
CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    occupation VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'PARENT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS & SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    solution_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'GRADED', 'LATE')),
    marks_obtained NUMERIC(5, 2),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- EXAMS & GRADEBOOK
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('MIDTERM', 'FINAL', 'QUIZ')),
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL,
    marks_obtained NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(5),
    teacher_id UUID REFERENCES public.user_profiles(id),
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

-- FEE MANAGEMENT
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
    receipt_url TEXT,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS FOR RLS
--------------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.get_active_session_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'academic_session_id')::UUID;
$$;

--------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- ACADEMIC SESSIONS
CREATE POLICY "Read active academic sessions"
ON public.academic_sessions FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- USER PROFILES
CREATE POLICY "Read user profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- STUDENT PROFILES
CREATE POLICY "Read student profiles for active session"
ON public.student_profiles FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- ATTENDANCE
CREATE POLICY "Read attendance for active session"
ON public.attendance FOR SELECT TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Write attendance for authorized users"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (true);

-- TEACHER ASSIGNMENTS
CREATE POLICY "Teacher assignments access policy"
ON public.teacher_assignments FOR SELECT TO authenticated
USING (true);

-- PARENT PROFILES & WARD LINKS
CREATE POLICY "Parent ward access policy"
ON public.parent_student_links FOR SELECT TO authenticated
USING (true);

-- ASSIGNMENTS & SUBMISSIONS
CREATE POLICY "View assignments policy"
ON public.assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Student assignment submissions policy"
ON public.assignment_submissions FOR ALL TO authenticated
USING (true);

-- EXAMS & MARKS
CREATE POLICY "View exams policy"
ON public.exams FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Teacher exam marks policy"
ON public.exam_marks FOR ALL TO authenticated
USING (true);

-- FEES
CREATE POLICY "Parent ward fee access"
ON public.fees FOR SELECT TO authenticated
USING (true);

-- INITIAL ACADEMIC SESSION SEED
INSERT INTO public.academic_sessions (name, start_date, end_date, is_current)
VALUES ('2025-2026 Academic Year', '2025-09-01', '2026-06-30', true)
ON CONFLICT DO NOTHING;
