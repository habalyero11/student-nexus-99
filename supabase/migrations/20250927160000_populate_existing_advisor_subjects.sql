-- Populate existing advisor assignments with appropriate subjects
-- This migration assigns default subjects to advisors who don't have any subjects assigned yet

-- Update advisor assignments to include subjects based on their grade level
-- This will assign all available subjects for each grade level to existing advisors

UPDATE public.advisor_assignments
SET subjects = (
  SELECT array_agg(s.name ORDER BY s.name)
  FROM public.subjects s
  WHERE s.grade_level = advisor_assignments.year_level
  AND s.is_active = true
)
WHERE subjects IS NULL OR array_length(subjects, 1) IS NULL;

-- Add a comment for documentation
COMMENT ON TABLE public.advisor_assignments IS 'Advisor assignments with section and subject responsibilities. Updated to include default subjects for existing assignments.';

-- Log the update for debugging
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.advisor_assignments
    WHERE subjects IS NOT NULL AND array_length(subjects, 1) > 0;

    RAISE NOTICE 'Updated advisor assignments. Total assignments with subjects: %', updated_count;
END $$;