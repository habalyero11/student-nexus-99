-- Create subjects table for dynamic subject management
-- This allows admins to add, edit, and delete subjects for each grade level

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    grade_level year_level NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint to prevent duplicate subjects per grade level
ALTER TABLE public.subjects
ADD CONSTRAINT unique_subject_per_grade_level
UNIQUE (name, grade_level);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_grade_level ON public.subjects(grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(is_active);

-- Enable Row Level Security
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can do everything
CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Advisors can only read subjects
CREATE POLICY "Advisors can read subjects" ON public.subjects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'advisor'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subjects_updated_at_trigger
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_subjects_updated_at();

-- Insert default subjects from subjects.md
-- Grade 7 and 8 subjects
INSERT INTO public.subjects (name, grade_level) VALUES
    ('Filipino', '7'),
    ('English', '7'),
    ('Science', '7'),
    ('Math', '7'),
    ('AP', '7'),
    ('MAPEH', '7'),
    ('TLE', '7'),
    ('GMRC', '7'),
    ('Values', '7'),
    ('Filipino', '8'),
    ('English', '8'),
    ('Science', '8'),
    ('Math', '8'),
    ('AP', '8'),
    ('MAPEH', '8'),
    ('TLE', '8'),
    ('GMRC', '8'),
    ('Values', '8')
ON CONFLICT (name, grade_level) DO NOTHING;

-- Grade 9 and 10 subjects (includes Elective)
INSERT INTO public.subjects (name, grade_level) VALUES
    ('Filipino', '9'),
    ('English', '9'),
    ('Science', '9'),
    ('Math', '9'),
    ('AP', '9'),
    ('MAPEH', '9'),
    ('TLE', '9'),
    ('GMRC', '9'),
    ('Values', '9'),
    ('Elective', '9'),
    ('Filipino', '10'),
    ('English', '10'),
    ('Science', '10'),
    ('Math', '10'),
    ('AP', '10'),
    ('MAPEH', '10'),
    ('TLE', '10'),
    ('GMRC', '10'),
    ('Values', '10'),
    ('Elective', '10')
ON CONFLICT (name, grade_level) DO NOTHING;

-- Grade 11 subjects (Senior High - 1st and 2nd semester)
INSERT INTO public.subjects (name, grade_level) VALUES
    ('Oral Communication', '11'),
    ('Introduction to the Philosophy of the Human Person', '11'),
    ('Empowerment Technology', '11'),
    ('P.E - 1', '11'),
    ('Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', '11'),
    ('General Mathematics', '11'),
    ('Pre-calculus', '11'),
    ('Earth Science', '11'),
    ('Reading and Writing', '11'),
    ('Disaster Readiness and Risk Reduction', '11'),
    ('Media and Information Literacy', '11'),
    ('P.E - 2', '11'),
    ('Pagbasa at Pagsusuri sa Ibat Ibang Teksto', '11'),
    ('Statistics and Probability', '11'),
    ('Basic Calculus', '11'),
    ('Practical Research 1', '11'),
    ('General Chemistry 1', '11')
ON CONFLICT (name, grade_level) DO NOTHING;

-- Grade 12 (placeholder - to be defined later)
-- No subjects inserted for Grade 12 as they're not defined yet

-- Create view for active subjects by grade level
CREATE OR REPLACE VIEW public.active_subjects_by_grade AS
SELECT
    grade_level,
    array_agg(name ORDER BY name) as subjects,
    count(*) as subject_count
FROM public.subjects
WHERE is_active = true
GROUP BY grade_level
ORDER BY grade_level;

-- Grant permissions
GRANT ALL ON public.subjects TO authenticated;
GRANT ALL ON public.active_subjects_by_grade TO authenticated;

-- Create function to get subjects for a specific grade level
CREATE OR REPLACE FUNCTION public.get_subjects_for_grade(target_grade_level year_level)
RETURNS TABLE(id UUID, name TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT s.id, s.name, s.is_active, s.created_at, s.updated_at
    FROM public.subjects s
    WHERE s.grade_level = target_grade_level
    AND s.is_active = true
    ORDER BY s.name;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_subjects_for_grade(year_level) TO authenticated;