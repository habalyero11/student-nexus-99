-- Create grade_history table for audit trail
-- This table will track all changes made to grades

CREATE TABLE IF NOT EXISTS public.grade_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    subject text NOT NULL,
    quarter text NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd', '4th')),

    -- Previous values (null for new records)
    old_written_work numeric(5,2),
    old_performance_task numeric(5,2),
    old_quarterly_assessment numeric(5,2),
    old_final_grade numeric(5,2),
    old_remarks text,

    -- New values
    new_written_work numeric(5,2),
    new_performance_task numeric(5,2),
    new_quarterly_assessment numeric(5,2),
    new_final_grade numeric(5,2),
    new_remarks text,

    -- Audit information
    action_type text NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    change_reason text,

    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_grade_history_grade_id ON public.grade_history(grade_id);
CREATE INDEX idx_grade_history_student_id ON public.grade_history(student_id);
CREATE INDEX idx_grade_history_changed_at ON public.grade_history(changed_at);
CREATE INDEX idx_grade_history_action_type ON public.grade_history(action_type);

-- Enable RLS
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grade_history
-- Admin can see all history
CREATE POLICY "Admins can view all grade history" ON public.grade_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Advisors can only see history for their assigned students
CREATE POLICY "Advisors can view grade history for assigned students" ON public.grade_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.advisors a ON a.profile_id = p.id
            JOIN public.advisor_assignments aa ON aa.advisor_id = a.id
            JOIN public.students s ON s.id = grade_history.student_id
            WHERE p.user_id = auth.uid()
            AND p.role = 'advisor'
            AND s.year_level = aa.year_level
            AND s.section = aa.section
            AND (aa.strand IS NULL OR s.strand = aa.strand)
        )
    );

-- Only the system (through functions) can insert/update grade history
CREATE POLICY "System can manage grade history" ON public.grade_history
    FOR ALL
    TO authenticated
    USING (false);

-- Function to automatically create grade history entries
CREATE OR REPLACE FUNCTION public.create_grade_history()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();

    IF TG_OP = 'INSERT' THEN
        -- Record the creation of a new grade
        INSERT INTO public.grade_history (
            grade_id,
            student_id,
            subject,
            quarter,
            new_written_work,
            new_performance_task,
            new_quarterly_assessment,
            new_final_grade,
            new_remarks,
            action_type,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            NEW.student_id,
            NEW.subject,
            NEW.quarter,
            NEW.written_work,
            NEW.performance_task,
            NEW.quarterly_assessment,
            NEW.final_grade,
            NEW.remarks,
            'INSERT',
            current_user_id,
            'Grade created'
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Record the update of an existing grade
        INSERT INTO public.grade_history (
            grade_id,
            student_id,
            subject,
            quarter,
            old_written_work,
            old_performance_task,
            old_quarterly_assessment,
            old_final_grade,
            old_remarks,
            new_written_work,
            new_performance_task,
            new_quarterly_assessment,
            new_final_grade,
            new_remarks,
            action_type,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            NEW.student_id,
            NEW.subject,
            NEW.quarter,
            OLD.written_work,
            OLD.performance_task,
            OLD.quarterly_assessment,
            OLD.final_grade,
            OLD.remarks,
            NEW.written_work,
            NEW.performance_task,
            NEW.quarterly_assessment,
            NEW.final_grade,
            NEW.remarks,
            'UPDATE',
            current_user_id,
            'Grade modified'
        );
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Record the deletion of a grade
        INSERT INTO public.grade_history (
            grade_id,
            student_id,
            subject,
            quarter,
            old_written_work,
            old_performance_task,
            old_quarterly_assessment,
            old_final_grade,
            old_remarks,
            action_type,
            changed_by,
            change_reason
        ) VALUES (
            OLD.id,
            OLD.student_id,
            OLD.subject,
            OLD.quarter,
            OLD.written_work,
            OLD.performance_task,
            OLD.quarterly_assessment,
            OLD.final_grade,
            OLD.remarks,
            'DELETE',
            current_user_id,
            'Grade deleted'
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log grade changes
DROP TRIGGER IF EXISTS grade_history_trigger ON public.grades;
CREATE TRIGGER grade_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.grades
    FOR EACH ROW
    EXECUTE FUNCTION public.create_grade_history();

-- Grant necessary permissions
GRANT SELECT ON public.grade_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.grade_history IS 'Audit trail for all grade changes including create, update, and delete operations';
COMMENT ON FUNCTION public.create_grade_history() IS 'Automatically creates audit trail entries for grade changes';