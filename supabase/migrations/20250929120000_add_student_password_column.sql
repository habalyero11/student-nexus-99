-- Add simple static password column for students
-- This is used only for student portal login (no Supabase Auth)

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT '1234';

COMMENT ON COLUMN public.students.password IS 'Simple student portal password (e.g. default 1234). Used only by custom login, not Supabase Auth.';

