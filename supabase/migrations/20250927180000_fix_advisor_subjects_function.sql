-- Fix the get_advisor_available_subjects function
-- The original function had a syntax error with array_agg(DISTINCT unnest())

CREATE OR REPLACE FUNCTION get_advisor_available_subjects(advisor_profile_id uuid)
RETURNS text[] AS $$
DECLARE
    subjects_array text[];
BEGIN
    WITH unnested_subjects AS (
        SELECT DISTINCT unnest(aa.subjects) as subject
        FROM public.advisor_assignments aa
        JOIN public.advisors a ON aa.advisor_id = a.id
        WHERE a.profile_id = advisor_profile_id
    )
    SELECT array_agg(subject) INTO subjects_array
    FROM unnested_subjects;

    RETURN COALESCE(subjects_array, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_advisor_available_subjects(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_advisor_available_subjects(uuid) IS 'Returns all subjects assigned to an advisor across all their assignments (fixed version)';