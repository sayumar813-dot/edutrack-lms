-- ============================================================================
-- SCHOLARFLOW / EDUTRACK ERP — COMPLETE MASTER DATABASE MIGRATION SCRIPT
-- Copy & Paste this entire file into your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------------------------------------
-- 2. CORE ACADEMIC & USER MANAGEMENT TABLES
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

-- USER PROFILES TABLE (Unified Auth & Profile System)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    roles TEXT[] DEFAULT ARRAY['STUDENT'],
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    phone_number VARCHAR(20),
    password_hash TEXT,
    must_reset_password BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    section VARCHAR(50),
    room_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    academic_session_id UUID REFERENCES public.academic_sessions(id),
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
-- 3. ERP MODULE TABLES (TEACHERS, PARENTS, ASSIGNMENTS, EXAMS, FEES)
--------------------------------------------------------------------------------

-- TEACHER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id, academic_session_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- PARENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    occupation VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

-- PARENT-STUDENT LINKAGE TABLE
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'PARENT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENT SUBMISSIONS TABLE
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

-- EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('MIDTERM', 'FINAL', 'QUIZ')),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- EXAM MARKS TABLE
CREATE TABLE IF NOT EXISTS public.exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(5),
    teacher_id UUID REFERENCES public.user_profiles(id),
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

-- FEE MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    receipt_url TEXT,
    academic_session_id UUID REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- ACADEMIC SESSIONS
DROP POLICY IF EXISTS "Read active academic sessions" ON public.academic_sessions;
CREATE POLICY "Read active academic sessions" ON public.academic_sessions FOR SELECT TO authenticated USING (true);

-- USER PROFILES
DROP POLICY IF EXISTS "Read user profiles" ON public.user_profiles;
CREATE POLICY "Read user profiles" ON public.user_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Write user profiles" ON public.user_profiles;
CREATE POLICY "Write user profiles" ON public.user_profiles FOR ALL TO authenticated USING (true);

-- CLASSES
DROP POLICY IF EXISTS "Classes read access" ON public.classes;
CREATE POLICY "Classes read access" ON public.classes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Classes write access for admin" ON public.classes;
CREATE POLICY "Classes write access for admin" ON public.classes FOR ALL TO authenticated USING (true);

-- SUBJECTS
DROP POLICY IF EXISTS "Subjects read access" ON public.subjects;
CREATE POLICY "Subjects read access" ON public.subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Subjects write access for admin" ON public.subjects;
CREATE POLICY "Subjects write access for admin" ON public.subjects FOR ALL TO authenticated USING (true);

-- STUDENT PROFILES
DROP POLICY IF EXISTS "Read student profiles" ON public.student_profiles;
CREATE POLICY "Read student profiles" ON public.student_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Write student profiles" ON public.student_profiles;
CREATE POLICY "Write student profiles" ON public.student_profiles FOR ALL TO authenticated USING (true);

-- ATTENDANCE
DROP POLICY IF EXISTS "Read attendance" ON public.attendance;
CREATE POLICY "Read attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Write attendance" ON public.attendance;
CREATE POLICY "Write attendance" ON public.attendance FOR ALL TO authenticated USING (true);

-- AUDIT LOGS
DROP POLICY IF EXISTS "Audit logs policy" ON public.audit_logs;
CREATE POLICY "Audit logs policy" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- TEACHER ASSIGNMENTS
DROP POLICY IF EXISTS "Teacher assignments access policy" ON public.teacher_assignments;
CREATE POLICY "Teacher assignments access policy" ON public.teacher_assignments FOR ALL TO authenticated USING (true);

-- PARENT PROFILES & WARD LINKS
DROP POLICY IF EXISTS "Parent profiles access policy" ON public.parent_profiles;
CREATE POLICY "Parent profiles access policy" ON public.parent_profiles FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Parent ward access policy" ON public.parent_student_links;
CREATE POLICY "Parent ward access policy" ON public.parent_student_links FOR ALL TO authenticated USING (true);

-- ASSIGNMENTS & SUBMISSIONS
DROP POLICY IF EXISTS "View assignments policy" ON public.assignments;
CREATE POLICY "View assignments policy" ON public.assignments FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Student assignment submissions policy" ON public.assignment_submissions;
CREATE POLICY "Student assignment submissions policy" ON public.assignment_submissions FOR ALL TO authenticated USING (true);

-- EXAMS & MARKS
DROP POLICY IF EXISTS "View exams policy" ON public.exams;
CREATE POLICY "View exams policy" ON public.exams FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Teacher exam marks policy" ON public.exam_marks;
CREATE POLICY "Teacher exam marks policy" ON public.exam_marks FOR ALL TO authenticated USING (true);

-- FEES
DROP POLICY IF EXISTS "Parent ward fee access" ON public.fees;
CREATE POLICY "Parent ward fee access" ON public.fees FOR ALL TO authenticated USING (true);

--------------------------------------------------------------------------------
-- 5. INITIAL SEED DATA
--------------------------------------------------------------------------------

-- Seed Active Academic Session
INSERT INTO public.academic_sessions (name, start_date, end_date, is_current)
VALUES ('2025-2026 Academic Year', '2025-09-01', '2026-06-30', true)
ON CONFLICT DO NOTHING;

-- Seed Default Admin Profile
INSERT INTO public.user_profiles (email, first_name, last_name, roles)
VALUES ('admin@edutrack.com', 'System', 'Admin', ARRAY['ADMIN'])
ON CONFLICT (email) DO NOTHING;
