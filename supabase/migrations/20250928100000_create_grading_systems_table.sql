-- Create grading_systems table for admin-configurable grading weights
CREATE TABLE public.grading_systems (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    written_work_percentage numeric(5,2) NOT NULL CHECK (written_work_percentage >= 0 AND written_work_percentage <= 100),
    performance_task_percentage numeric(5,2) NOT NULL CHECK (performance_task_percentage >= 0 AND performance_task_percentage <= 100),
    quarterly_assessment_percentage numeric(5,2) NOT NULL CHECK (quarterly_assessment_percentage >= 0 AND quarterly_assessment_percentage <= 100),
    is_active boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraint to ensure percentages sum to 100
    CONSTRAINT percentages_sum_100 CHECK (
        (written_work_percentage + performance_task_percentage + quarterly_assessment_percentage) = 100
    ),

    -- Unique constraint to ensure only one active system at a time
    CONSTRAINT unique_active_system EXCLUDE (is_active WITH =) WHERE (is_active = true)
);

-- Create unique index for name to prevent duplicates
CREATE UNIQUE INDEX idx_grading_systems_name ON public.grading_systems(name);

-- Create index for active system lookups
CREATE INDEX idx_grading_systems_active ON public.grading_systems(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow admins to view all grading systems
CREATE POLICY "Admins can view all grading systems" ON public.grading_systems
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to create grading systems
CREATE POLICY "Admins can create grading systems" ON public.grading_systems
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update grading systems
CREATE POLICY "Admins can update grading systems" ON public.grading_systems
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to delete grading systems (except active ones)
CREATE POLICY "Admins can delete inactive grading systems" ON public.grading_systems
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        ) AND is_active = false
    );

-- Allow everyone to view the active grading system
CREATE POLICY "Everyone can view active grading system" ON public.grading_systems
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grading_systems_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_grading_systems_updated_at
    BEFORE UPDATE ON public.grading_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_grading_systems_updated_at();

-- Insert default DepEd K-12 grading system
INSERT INTO public.grading_systems (
    name,
    description,
    written_work_percentage,
    performance_task_percentage,
    quarterly_assessment_percentage,
    is_active
) VALUES (
    'DepEd K-12 Standard',
    'Standard grading system based on DepEd K-12 curriculum guidelines',
    25.00,
    50.00,
    25.00,
    true
);

-- Create function to get active grading system
CREATE OR REPLACE FUNCTION get_active_grading_system()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    written_work_percentage numeric,
    performance_task_percentage numeric,
    quarterly_assessment_percentage numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.id,
        gs.name,
        gs.description,
        gs.written_work_percentage,
        gs.performance_task_percentage,
        gs.quarterly_assessment_percentage
    FROM public.grading_systems gs
    WHERE gs.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_active_grading_system() TO authenticated;

-- Add comment
COMMENT ON TABLE public.grading_systems IS 'Configurable grading systems with percentage weights for different assessment types';
COMMENT ON FUNCTION get_active_grading_system() IS 'Returns the currently active grading system configuration';