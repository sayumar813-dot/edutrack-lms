-- Migration: 20260807020000_classes_subjects_auth.sql
-- Add auth columns to user_profiles and create classes and subjects tables

-- 1. Extend user_profiles table for custom credential auth
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- 2. Create Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    section VARCHAR(50),
    room_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classes read access" ON public.classes 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Classes write access for admin" ON public.classes 
    FOR ALL TO authenticated USING (true);

-- 3. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects read access" ON public.subjects 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Subjects write access for admin" ON public.subjects 
    FOR ALL TO authenticated USING (true);
