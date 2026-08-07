-- Seed initial Academic Session
INSERT INTO public.academic_sessions (id, name, start_date, end_date, is_current)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2025-2026 Academic Year',
    '2025-09-01',
    '2026-06-30',
    true
) ON CONFLICT (id) DO NOTHING;
