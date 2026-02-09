-- Extend grading_systems table for advisor-specific grading systems
-- Add advisor_id to allow advisors to create their own grading systems
-- Add grade_scale for custom grade scale ranges

-- Add advisor_id column (nullable - null means global/admin system)
ALTER TABLE public.grading_systems
    ADD COLUMN advisor_id uuid REFERENCES public.advisors(id) ON DELETE CASCADE;

-- Add grade_scale column for custom grade scale definitions
-- Structure: [{"min": 90, "max": 100, "label": "Outstanding"}, ...]
ALTER TABLE public.grading_systems
    ADD COLUMN grade_scale jsonb DEFAULT '[
        {"min": 90, "max": 100, "label": "Outstanding"},
        {"min": 85, "max": 89, "label": "Very Satisfactory"},
        {"min": 80, "max": 84, "label": "Satisfactory"},
        {"min": 75, "max": 79, "label": "Fairly Satisfactory"},
        {"min": 0, "max": 74, "label": "Did Not Meet Expectations"}
    ]'::jsonb;

-- Update unique active system constraint to be per advisor
-- Drop the old constraint
ALTER TABLE public.grading_systems
    DROP CONSTRAINT IF EXISTS unique_active_system;

-- Create new constraint: only one active system per advisor (or globally if advisor_id is null)
CREATE UNIQUE INDEX idx_unique_active_per_advisor ON public.grading_systems(advisor_id, is_active)
    WHERE is_active = true;

-- Create index for advisor lookups
CREATE INDEX idx_grading_systems_advisor ON public.grading_systems(advisor_id)
    WHERE advisor_id IS NOT NULL;

-- Update RLS Policies for advisor access

-- Allow advisors to view their own grading systems
CREATE POLICY "Advisors can view own grading systems" ON public.grading_systems
    FOR SELECT TO authenticated
    USING (
        advisor_id IN (
            SELECT a.id FROM public.advisors a
            JOIN public.profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow advisors to create their own grading systems
CREATE POLICY "Advisors can create own grading systems" ON public.grading_systems
    FOR INSERT TO authenticated
    WITH CHECK (
        advisor_id IN (
            SELECT a.id FROM public.advisors a
            JOIN public.profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow advisors to update their own grading systems
CREATE POLICY "Advisors can update own grading systems" ON public.grading_systems
    FOR UPDATE TO authenticated
    USING (
        advisor_id IN (
            SELECT a.id FROM public.advisors a
            JOIN public.profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow advisors to delete their own inactive grading systems
CREATE POLICY "Advisors can delete own inactive grading systems" ON public.grading_systems
    FOR DELETE TO authenticated
    USING (
        advisor_id IN (
            SELECT a.id FROM public.advisors a
            JOIN public.profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        ) AND is_active = false
    );

-- Update get_active_grading_system function to support advisor_id parameter
CREATE OR REPLACE FUNCTION get_active_grading_system(p_advisor_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    written_work_percentage numeric,
    performance_task_percentage numeric,
    quarterly_assessment_percentage numeric,
    grade_scale jsonb
) AS $$
BEGIN
    -- If advisor_id is provided, try to get their active system first
    IF p_advisor_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            gs.id,
            gs.name,
            gs.description,
            gs.written_work_percentage,
            gs.performance_task_percentage,
            gs.quarterly_assessment_percentage,
            gs.grade_scale
        FROM public.grading_systems gs
        WHERE gs.advisor_id = p_advisor_id
        AND gs.is_active = true
        LIMIT 1;
        
        -- If advisor has an active system, return it
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Otherwise, return the global active system (where advisor_id is null)
    RETURN QUERY
    SELECT
        gs.id,
        gs.name,
        gs.description,
        gs.written_work_percentage,
        gs.performance_task_percentage,
        gs.quarterly_assessment_percentage,
        gs.grade_scale
    FROM public.grading_systems gs
    WHERE gs.advisor_id IS NULL
    AND gs.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_grading_system(uuid) TO authenticated;

-- Add comments
COMMENT ON COLUMN public.grading_systems.advisor_id IS 'Advisor who owns this grading system. NULL means global/admin system.';
COMMENT ON COLUMN public.grading_systems.grade_scale IS 'Custom grade scale ranges as JSON array';
COMMENT ON FUNCTION get_active_grading_system(uuid) IS 'Returns the active grading system for an advisor, or global system if none exists';
