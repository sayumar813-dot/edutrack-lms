-- Migration File: supabase/migrations/20260807010000_full_erp_modules.sql

-- 1. TEACHER ASSIGNMENTS
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

-- 2. PARENT PROFILES & WARD LINKS
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

-- 3. ASSIGNMENTS & SUBMISSIONS
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
    grade VARCHAR(10),
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- 4. EXAMS & GRADEBOOK
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    exam_type VARCHAR(50) NOT NULL, -- MIDTERM, FINAL, QUIZ
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    max_marks NUMERIC(5,2) NOT NULL,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL,
    marks_obtained NUMERIC(5,2) NOT NULL,
    grade VARCHAR(5),
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id),
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

-- 5. FEE MANAGEMENT & INVOICING
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    paid_amount NUMERIC(10,2) DEFAULT 0.00,
    receipt_url TEXT,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- HIGH-PERFORMANCE RLS POLICIES
--------------------------------------------------------------------------------

-- Teacher Assignment RLS
CREATE POLICY "Teacher assignments read"
ON public.teacher_assignments FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- Parent profiles RLS
CREATE POLICY "Parent profiles read self or admin"
ON public.parent_profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_permission('USER:READ'));

CREATE POLICY "Parent student links read"
ON public.parent_student_links FOR SELECT TO authenticated
USING (parent_id = auth.uid() OR public.has_permission('USER:READ'));

-- Assignments RLS
CREATE POLICY "Assignments read for active session"
ON public.assignments FOR SELECT TO authenticated
USING (academic_session_id = public.get_active_session_id());

CREATE POLICY "Assignments write for teachers/admins"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (
    academic_session_id = public.get_active_session_id()
    AND public.has_permission('ASSIGNMENT:WRITE')
);

-- Teachers can ONLY enter marks for assigned subjects in current session
CREATE POLICY "Teacher exam marks restricted to assignments"
ON public.exam_marks FOR ALL TO authenticated
USING (
    academic_session_id = public.get_active_session_id()
    AND (
        public.has_permission('MARKS:ADMIN')
        OR subject_id IN (
            SELECT subject_id FROM public.teacher_assignments 
            WHERE teacher_id = auth.uid() 
              AND academic_session_id = public.get_active_session_id()
        )
    )
);

-- Parents can ONLY read linked ward records
CREATE POLICY "Parent ward fee access"
ON public.fees FOR SELECT TO authenticated
USING (
    academic_session_id = public.get_active_session_id()
    AND (
        student_id IN (
            SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
        )
        OR public.has_permission('FEE:READ')
    )
);

-- Students submit own assignments
CREATE POLICY "Student assignment submissions policy"
ON public.assignment_submissions FOR ALL TO authenticated
USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    OR public.has_permission('ASSIGNMENT:GRADE')
);
