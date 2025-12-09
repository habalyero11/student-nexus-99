-- Simple RLS policies for grades table to fix 406 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view grades" ON grades;
DROP POLICY IF EXISTS "Users can insert grades" ON grades;
DROP POLICY IF EXISTS "Users can update grades" ON grades;
DROP POLICY IF EXISTS "Users can delete grades" ON grades;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "Authenticated users can view grades" ON grades
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert grades" ON grades
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update grades" ON grades
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin users can delete grades" ON grades
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON grades TO authenticated;