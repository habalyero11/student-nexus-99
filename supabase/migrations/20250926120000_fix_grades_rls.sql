-- Fix RLS policies for grades table to allow proper access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view grades" ON grades;
DROP POLICY IF EXISTS "Users can insert grades" ON grades;
DROP POLICY IF EXISTS "Users can update grades" ON grades;
DROP POLICY IF EXISTS "Users can delete grades" ON grades;

-- Create new comprehensive RLS policies for grades
CREATE POLICY "Users can view grades" ON grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'advisor'
          AND EXISTS (
            SELECT 1 FROM students s
            JOIN advisor_assignments aa ON (
              s.year_level = aa.year_level
              AND s.section = aa.section
              AND (aa.strand IS NULL OR s.strand = aa.strand)
            )
            JOIN advisors a ON aa.advisor_id = a.id
            WHERE s.id = grades.student_id
            AND a.profile_id = profiles.id
          )
        )
      )
    )
  );

CREATE POLICY "Users can insert grades" ON grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'advisor'
          AND EXISTS (
            SELECT 1 FROM students s
            JOIN advisor_assignments aa ON (
              s.year_level = aa.year_level
              AND s.section = aa.section
              AND (aa.strand IS NULL OR s.strand = aa.strand)
            )
            JOIN advisors a ON aa.advisor_id = a.id
            WHERE s.id = grades.student_id
            AND a.profile_id = profiles.id
          )
        )
      )
    )
  );

CREATE POLICY "Users can update grades" ON grades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'advisor'
          AND EXISTS (
            SELECT 1 FROM students s
            JOIN advisor_assignments aa ON (
              s.year_level = aa.year_level
              AND s.section = aa.section
              AND (aa.strand IS NULL OR s.strand = aa.strand)
            )
            JOIN advisors a ON aa.advisor_id = a.id
            WHERE s.id = grades.student_id
            AND a.profile_id = profiles.id
          )
        )
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'advisor'
          AND EXISTS (
            SELECT 1 FROM students s
            JOIN advisor_assignments aa ON (
              s.year_level = aa.year_level
              AND s.section = aa.section
              AND (aa.strand IS NULL OR s.strand = aa.strand)
            )
            JOIN advisors a ON aa.advisor_id = a.id
            WHERE s.id = grades.student_id
            AND a.profile_id = profiles.id
          )
        )
      )
    )
  );

CREATE POLICY "Users can delete grades" ON grades
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ensure RLS is enabled on grades table
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON grades TO authenticated;