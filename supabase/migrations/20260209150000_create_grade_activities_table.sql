-- Extend grades system to support Excel-style individual activity scores
-- Create a new table for storing individual activity scores per component

CREATE TABLE public.grade_activities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject text NOT NULL,
    quarter quarter NOT NULL,
    component text NOT NULL CHECK (component IN ('written_work', 'performance_task', 'quarterly_assessment')),
    
    -- Activity scores stored as JSONB array
    -- Structure: [{"score": 8, "max": 10}, {"score": 9, "max": 10}, ...]
    activities jsonb DEFAULT '[]'::jsonb,
    
    -- Computed values
    total_score numeric(6,2),
    highest_possible_score numeric(6,2),
    percentage_score numeric(5,2), -- PS
    weighted_score numeric(5,2),   -- WS
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint: one record per student/subject/quarter/component
    CONSTRAINT unique_grade_activity UNIQUE (student_id, subject, quarter, component)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_grade_activities_student ON public.grade_activities(student_id);
CREATE INDEX idx_grade_activities_lookup ON public.grade_activities(student_id, subject, quarter);

-- Enable RLS
ALTER TABLE public.grade_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view grade activities" ON public.grade_activities
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can manage grade activities" ON public.grade_activities
    FOR ALL TO authenticated
    USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_grade_activities_updated_at
    BEFORE UPDATE ON public.grade_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate grade activity scores
CREATE OR REPLACE FUNCTION calculate_grade_activity_scores()
RETURNS TRIGGER AS $$
DECLARE
    activity jsonb;
    total numeric := 0;
    max_total numeric := 0;
BEGIN
    -- Calculate total_score and highest_possible_score from activities array
    FOR activity IN SELECT * FROM jsonb_array_elements(NEW.activities)
    LOOP
        total := total + COALESCE((activity->>'score')::numeric, 0);
        max_total := max_total + COALESCE((activity->>'max')::numeric, 0);
    END LOOP;
    
    NEW.total_score := total;
    NEW.highest_possible_score := max_total;
    
    -- Calculate percentage score (PS)
    IF max_total > 0 THEN
        NEW.percentage_score := ROUND((total / max_total * 100)::numeric, 2);
    ELSE
        NEW.percentage_score := 0;
    END IF;
    
    -- Note: weighted_score (WS) will be calculated separately based on grading system
    -- which might be advisor-specific, so we'll handle that in the application layer
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate scores
CREATE TRIGGER calculate_grade_activity_scores_trigger
    BEFORE INSERT OR UPDATE ON public.grade_activities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_grade_activity_scores();

-- Create view to get comprehensive grade data with activities
CREATE OR REPLACE VIEW grade_sheet_comprehensive AS
SELECT
    s.id as student_id,
    s.first_name,
    s.last_name,
    s.student_id_no,
    s.year_level,
    s.section,
    g.id as grade_id,
    g.subject,
    g.quarter,
    g.written_work,
    g.performance_task,
    g.quarterly_assessment,
    g.final_grade,
    g.remarks,
    
    -- Get activity details
    (SELECT row_to_json(ga.*) FROM grade_activities ga 
     WHERE ga.student_id = s.id AND ga.subject = g.subject 
     AND ga.quarter = g.quarter AND ga.component = 'written_work') as ww_activities,
    
    (SELECT row_to_json(ga.*) FROM grade_activities ga 
     WHERE ga.student_id = s.id AND ga.subject = g.subject 
     AND ga.quarter = g.quarter AND ga.component = 'performance_task') as pt_activities,
    
    (SELECT row_to_json(ga.*) FROM grade_activities ga 
     WHERE ga.student_id = s.id AND ga.subject = g.subject 
     AND ga.quarter = g.quarter AND ga.component = 'quarterly_assessment') as qa_activities
     
FROM students s
LEFT JOIN grades g ON s.id = g.student_id
ORDER BY s.last_name, s.first_name, g.subject, g.quarter;

-- Grant access to the view
GRANT SELECT ON grade_sheet_comprehensive TO authenticated;

-- Add comments
COMMENT ON TABLE public.grade_activities IS 'Stores individual activity scores per component matching Excel grade sheet structure';
COMMENT ON COLUMN public.grade_activities.activities IS 'Array of activity scores: [{"score": 8, "max": 10}, ...]';
COMMENT ON COLUMN public.grade_activities.percentage_score IS 'Percentage Score (PS): (total_score / highest_possible_score) * 100';
COMMENT ON COLUMN public.grade_activities.weighted_score IS 'Weighted Score (WS): percentage_score * weight from grading system';
COMMENT ON VIEW grade_sheet_comprehensive IS 'Comprehensive view combining grades and individual activities for Excel-style display';
