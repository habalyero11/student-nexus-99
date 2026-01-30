-- Fix RLS 500 errors and implement proper advisor filtering
--
-- HOW TO APPLY:
--   Option A: supabase db push   (or supabase migration up)
--   Option B: Copy this file into Supabase SQL Editor and run (if you apply SQL manually)
--
-- ROOT CAUSE: Policies that use "SELECT FROM profiles WHERE user_id = auth.uid() AND role = 'admin'"
-- trigger profiles RLS. The "Admins can view all profiles" policy does the same SELECT, causing
-- infinite recursion -> 500 Internal Server Error.
--
-- FIX: SECURITY DEFINER functions that read profiles without triggering RLS. Use these in all
-- policies instead of subquerying profiles.
--
-- Also: Advisors must only see students (and related grades/attendance) matching their
-- advisor_assignments (year_level, section, strand). Admin sees everything.

-- =============================================================================
-- 1. SECURITY DEFINER helpers (bypass RLS when reading profiles)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;

-- =============================================================================
-- 2. PROFILES – remove recursive policies, use helpers
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_my_profile_role() = 'admin');

-- =============================================================================
-- 3. ADVISORS – avoid reading profiles in RLS
-- =============================================================================

DROP POLICY IF EXISTS "Advisors can view their own details" ON public.advisors;
DROP POLICY IF EXISTS "Advisors can update their own details" ON public.advisors;
DROP POLICY IF EXISTS "Admins can manage all advisors" ON public.advisors;

CREATE POLICY "Advisors can view their own details" ON public.advisors
  FOR SELECT USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Advisors can update their own details" ON public.advisors
  FOR UPDATE USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all advisors" ON public.advisors
  FOR ALL USING (public.get_my_profile_role() = 'admin');

-- =============================================================================
-- 4. STUDENTS – admin: all; advisor: only assigned (year_level, section, strand)
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Advisors can create students" ON public.students;
DROP POLICY IF EXISTS "Advisors can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

-- Admin sees all; advisor sees only students in their advisor_assignments
CREATE POLICY "Admins can view all students" ON public.students
  FOR SELECT USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can view assigned students" ON public.students
  FOR SELECT USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.advisors a
      JOIN public.advisor_assignments aa ON aa.advisor_id = a.id
      WHERE a.profile_id = public.get_my_profile_id()
        AND students.year_level = aa.year_level
        AND students.section = aa.section
        AND (aa.strand IS NULL OR students.strand = aa.strand)
    )
  );

-- Advisors can create students only in their assigned year_level/section/strand
-- (students.* in WITH CHECK refers to the new row being inserted)
CREATE POLICY "Advisors can create students in assigned" ON public.students
  FOR INSERT WITH CHECK (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.advisors a
      JOIN public.advisor_assignments aa ON aa.advisor_id = a.id
      WHERE a.profile_id = public.get_my_profile_id()
        AND aa.year_level = students.year_level
        AND aa.section = students.section
        AND (aa.strand IS NULL OR students.strand = aa.strand)
    )
  );

-- Advisors can update only students they can see (same assignment filter)
CREATE POLICY "Advisors can update assigned students" ON public.students
  FOR UPDATE USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.advisors a
      JOIN public.advisor_assignments aa ON aa.advisor_id = a.id
      WHERE a.profile_id = public.get_my_profile_id()
        AND students.year_level = aa.year_level
        AND students.section = aa.section
        AND (aa.strand IS NULL OR students.strand = aa.strand)
    )
  );

CREATE POLICY "Admins can create students" ON public.students
  FOR INSERT WITH CHECK (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can update students" ON public.students
  FOR UPDATE USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can delete students" ON public.students
  FOR DELETE USING (public.get_my_profile_role() = 'admin');

-- =============================================================================
-- 5. ADVISOR_ASSIGNMENTS – avoid profiles in subquery
-- =============================================================================

DROP POLICY IF EXISTS "Advisors can view their own assignments" ON public.advisor_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.advisor_assignments;

CREATE POLICY "Advisors can view their own assignments" ON public.advisor_assignments
  FOR SELECT USING (
    advisor_id IN (
      SELECT a.id FROM public.advisors a
      WHERE a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Admins can manage all assignments" ON public.advisor_assignments
  FOR ALL USING (public.get_my_profile_role() = 'admin');

-- =============================================================================
-- 6. GRADES – admin: all; advisor: only for assigned students
--    (replace simple_grades and any fix_grades policies)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view grades" ON public.grades;
DROP POLICY IF EXISTS "Users can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Users can update grades" ON public.grades;
DROP POLICY IF EXISTS "Users can delete grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can view grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can update grades" ON public.grades;
DROP POLICY IF EXISTS "Advisors can manage grades" ON public.grades;
DROP POLICY IF EXISTS "Admin users can delete grades" ON public.grades;

CREATE POLICY "Admins can view all grades" ON public.grades
  FOR SELECT USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can view grades for assigned students" ON public.grades
  FOR SELECT USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = grades.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Admins can insert grades" ON public.grades
  FOR INSERT WITH CHECK (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can insert grades for assigned students" ON public.grades
  FOR INSERT WITH CHECK (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = grades.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Admins can update grades" ON public.grades
  FOR UPDATE USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can update grades for assigned students" ON public.grades
  FOR UPDATE USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = grades.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Admins can delete grades" ON public.grades
  FOR DELETE USING (public.get_my_profile_role() = 'admin');

-- =============================================================================
-- 7. ATTENDANCE – admin: all; advisor: only for assigned students
-- =============================================================================

DROP POLICY IF EXISTS "Users can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Advisors can manage attendance" ON public.attendance;

CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR SELECT USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can view attendance for assigned students" ON public.attendance
  FOR SELECT USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = attendance.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can manage attendance for assigned students" ON public.attendance
  FOR INSERT WITH CHECK (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = attendance.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Advisors can update attendance for assigned students" ON public.attendance
  FOR UPDATE USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = attendance.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

CREATE POLICY "Advisors can delete attendance for assigned students" ON public.attendance
  FOR DELETE USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.advisor_assignments aa ON s.year_level = aa.year_level AND s.section = aa.section AND (aa.strand IS NULL OR s.strand = aa.strand)
      JOIN public.advisors a ON aa.advisor_id = a.id
      WHERE s.id = attendance.student_id AND a.profile_id = public.get_my_profile_id()
    )
  );

-- =============================================================================
-- 8. GRADE_HISTORY – use helpers instead of selecting from profiles
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all grade history" ON public.grade_history;
DROP POLICY IF EXISTS "Advisors can view grade history for assigned students" ON public.grade_history;

CREATE POLICY "Admins can view all grade history" ON public.grade_history
  FOR SELECT TO authenticated
  USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can view grade history for assigned students" ON public.grade_history
  FOR SELECT TO authenticated
  USING (
    public.get_my_profile_role() = 'advisor'
    AND EXISTS (
      SELECT 1 FROM public.advisors a
      JOIN public.advisor_assignments aa ON aa.advisor_id = a.id
      JOIN public.students s ON s.id = grade_history.student_id
      WHERE a.profile_id = public.get_my_profile_id()
        AND s.year_level = aa.year_level
        AND s.section = aa.section
        AND (aa.strand IS NULL OR s.strand = aa.strand)
    )
  );

-- =============================================================================
-- 9. GRADING_SYSTEMS – use get_my_profile_role
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all grading systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Admins can create grading systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Admins can update grading systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Admins can delete inactive grading systems" ON public.grading_systems;

CREATE POLICY "Admins can view all grading systems" ON public.grading_systems
  FOR SELECT TO authenticated
  USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can create grading systems" ON public.grading_systems
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can update grading systems" ON public.grading_systems
  FOR UPDATE TO authenticated
  USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Admins can delete inactive grading systems" ON public.grading_systems
  FOR DELETE TO authenticated
  USING (public.get_my_profile_role() = 'admin' AND is_active = false);

-- =============================================================================
-- 10. SUBJECTS – use get_my_profile_role
-- =============================================================================

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Advisors can read subjects" ON public.subjects;

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (public.get_my_profile_role() = 'admin');

CREATE POLICY "Advisors can read subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (public.get_my_profile_role() = 'advisor');
