-- Student authentication: link to auth.users and force password change
-- Password reset requests for advisor/admin to reset student passwords to 1234

-- 1. Add auth columns to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);

-- 2. Password reset requests: student requests, advisor/admin resolve
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz
);

CREATE INDEX idx_password_reset_requests_student ON public.password_reset_requests(student_id);
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_requested ON public.password_reset_requests(requested_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Insert is done via Edge Function (request-student-password-reset) with service role to validate student_id_no

-- Admins see all; advisors see only for their assigned students
CREATE POLICY "Admins can view all password reset requests" ON public.password_reset_requests
  FOR SELECT USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can view requests for assigned students" ON public.password_reset_requests
  FOR SELECT USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = password_reset_requests.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

-- Only admin/advisor can update (resolve)
CREATE POLICY "Admins can update password reset requests" ON public.password_reset_requests
  FOR UPDATE USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can update requests for assigned students" ON public.password_reset_requests
  FOR UPDATE USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = password_reset_requests.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

-- 3. Students: allow select by auth_user_id for own profile (for StudentPortal)
-- Existing RLS already has admin/advisor. We need: student can read own row when auth_user_id = auth.uid()
CREATE POLICY "Students can view own profile" ON public.students
  FOR SELECT USING (auth_user_id = auth.uid());

-- 4. RPC for student to mark password as changed (after updateUser in the app)
CREATE OR REPLACE FUNCTION public.student_confirm_password_changed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students
  SET must_change_password = false
  WHERE auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_confirm_password_changed() TO authenticated;
