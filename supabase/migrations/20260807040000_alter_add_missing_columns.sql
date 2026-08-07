-- ============================================================================
-- EDUTRACK LMS — ALTER EXISTING TABLES (Add Missing Columns)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS checks)
-- ============================================================================

-- 1. Add teacher_id to classes table (if missing)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 2. Add class_id and teacher_id to subjects table (if missing)
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 3. Add user_id to student_profiles (if missing — should already exist)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 4. Add phone_number, password_hash, etc. to user_profiles (if missing)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- 5. Create teacher_assignments table if it doesn't exist yet
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

DROP POLICY IF EXISTS "Teacher assignments access policy" ON public.teacher_assignments;
CREATE POLICY "Teacher assignments access policy" ON public.teacher_assignments FOR ALL TO authenticated USING (true);

-- 6. Add RLS policies for classes and subjects (safe drop+recreate)
DROP POLICY IF EXISTS "Classes read access" ON public.classes;
CREATE POLICY "Classes read access" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Classes write access for admin" ON public.classes;
CREATE POLICY "Classes write access for admin" ON public.classes FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Subjects read access" ON public.subjects;
CREATE POLICY "Subjects read access" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subjects write access for admin" ON public.subjects;
CREATE POLICY "Subjects write access for admin" ON public.subjects FOR ALL TO authenticated USING (true);

-- Done! All existing tables have been updated.
SELECT 'Migration complete. All missing columns added.' AS status;
