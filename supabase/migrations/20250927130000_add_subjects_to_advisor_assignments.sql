-- Add subjects field to advisor_assignments table for subject-specific advisor assignments
-- This restructures the advisor system to assign specific subjects to advisors

-- First, add the subjects column as an array of text
ALTER TABLE public.advisor_assignments
ADD COLUMN subjects text[] DEFAULT '{}';

-- Add a comment to explain the new field
COMMENT ON COLUMN public.advisor_assignments.subjects IS 'Array of subjects assigned to this advisor for this section (e.g., {"Math", "Science", "English"})';

-- Create an index on the subjects array for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_assignments_subjects
ON public.advisor_assignments USING GIN (subjects);

-- Update existing assignments to temporarily include all subjects based on year level
-- This ensures current advisors maintain access until proper subject assignments are made

UPDATE public.advisor_assignments
SET subjects = CASE
    WHEN year_level IN ('7', '8') THEN
        ARRAY['Filipino', 'English', 'Science', 'Math', 'AP', 'MAPEH', 'TLE', 'GMRC', 'Values']
    WHEN year_level IN ('9', '10') THEN
        ARRAY['Filipino', 'English', 'Science', 'Math', 'AP', 'MAPEH', 'TLE', 'GMRC', 'Values', 'Elective']
    WHEN year_level = '11' THEN
        ARRAY[
            'Oral Communication',
            'Introduction to the Philosophy of the Human Person',
            'Empowerment Technology',
            'P.E-1',
            'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
            'General Mathematics',
            'Pre-calculus',
            'Earth Science',
            'Reading and Writing',
            'Disaster Readiness and Risk Reduction',
            'Media and Information Literacy',
            'P.E-2',
            'Pagbasa at Pagsusuri sa Ibat Ibang Teksto',
            'Statistics and Probability',
            'Basic Calculus',
            'Practical Research 1',
            'General Chemistry 1'
        ]
    WHEN year_level = '12' THEN
        ARRAY[
            'Oral Communication',
            'Reading and Writing',
            'General Mathematics',
            'Statistics and Probability',
            'Earth and Life Science',
            'Physical Science',
            'Research',
            'Filipino sa Piling Larangan'
        ]
    ELSE ARRAY['General']
END
WHERE subjects = '{}' OR subjects IS NULL;

-- Create a function to validate subjects against the curriculum
CREATE OR REPLACE FUNCTION validate_advisor_subjects()
RETURNS TRIGGER AS $$
DECLARE
    valid_subjects text[];
BEGIN
    -- Define valid subjects based on year level
    CASE NEW.year_level
        WHEN '7', '8' THEN
            valid_subjects := ARRAY['Filipino', 'English', 'Science', 'Math', 'AP', 'MAPEH', 'TLE', 'GMRC', 'Values'];
        WHEN '9', '10' THEN
            valid_subjects := ARRAY['Filipino', 'English', 'Science', 'Math', 'AP', 'MAPEH', 'TLE', 'GMRC', 'Values', 'Elective'];
        WHEN '11' THEN
            valid_subjects := ARRAY[
                'Oral Communication',
                'Introduction to the Philosophy of the Human Person',
                'Empowerment Technology',
                'P.E-1',
                'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
                'General Mathematics',
                'Pre-calculus',
                'Earth Science',
                'Reading and Writing',
                'Disaster Readiness and Risk Reduction',
                'Media and Information Literacy',
                'P.E-2',
                'Pagbasa at Pagsusuri sa Ibat Ibang Teksto',
                'Statistics and Probability',
                'Basic Calculus',
                'Practical Research 1',
                'General Chemistry 1'
            ];
        WHEN '12' THEN
            valid_subjects := ARRAY[
                'Oral Communication',
                'Reading and Writing',
                'General Mathematics',
                'Statistics and Probability',
                'Earth and Life Science',
                'Physical Science',
                'Research',
                'Filipino sa Piling Larangan'
            ];
        ELSE
            valid_subjects := ARRAY['General'];
    END CASE;

    -- Check if all assigned subjects are valid for this year level
    IF NOT (NEW.subjects <@ valid_subjects) THEN
        RAISE EXCEPTION 'Invalid subjects assigned for year level %. Valid subjects are: %',
            NEW.year_level, array_to_string(valid_subjects, ', ');
    END IF;

    -- Ensure subjects array is not empty
    IF array_length(NEW.subjects, 1) IS NULL OR array_length(NEW.subjects, 1) = 0 THEN
        RAISE EXCEPTION 'At least one subject must be assigned to the advisor';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate subjects on insert/update
DROP TRIGGER IF EXISTS trigger_validate_advisor_subjects ON public.advisor_assignments;
CREATE TRIGGER trigger_validate_advisor_subjects
    BEFORE INSERT OR UPDATE ON public.advisor_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_advisor_subjects();

-- Create a view to get advisor assignments with subject details
CREATE OR REPLACE VIEW public.advisor_assignments_detailed AS
SELECT
    aa.*,
    a.profile_id,
    p.first_name,
    p.last_name,
    p.email,
    unnest(aa.subjects) as subject,
    CASE
        WHEN aa.year_level IN ('7', '8', '9', '10') THEN 'Junior High School'
        WHEN aa.year_level IN ('11', '12') THEN 'Senior High School'
        ELSE 'Unknown'
    END as school_level
FROM public.advisor_assignments aa
JOIN public.advisors a ON aa.advisor_id = a.id
JOIN public.profiles p ON a.profile_id = p.id;

-- Grant permissions
GRANT SELECT ON public.advisor_assignments_detailed TO authenticated;

-- Add helpful comments
COMMENT ON VIEW public.advisor_assignments_detailed IS 'Detailed view of advisor assignments including subject breakdown and advisor information';
COMMENT ON FUNCTION validate_advisor_subjects() IS 'Validates that assigned subjects match the curriculum for the given year level';