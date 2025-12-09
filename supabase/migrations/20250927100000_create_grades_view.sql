-- Create a readable view for grades that joins with student information
-- This provides a much cleaner interface for viewing grades in Supabase dashboard

CREATE OR REPLACE VIEW public.grades_readable AS
SELECT
    g.id as grade_id,
    -- Student information for better readability
    s.student_id_no,
    s.student_lrn,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    s.year_level,
    s.section,
    s.strand,
    -- Grade information
    g.subject,
    g.quarter,
    g.written_work,
    g.performance_task,
    g.quarterly_assessment,
    g.final_grade,
    -- Grade status based on final_grade
    CASE
        WHEN g.final_grade IS NULL THEN 'Incomplete'
        WHEN g.final_grade >= 90 THEN 'Outstanding'
        WHEN g.final_grade >= 85 THEN 'Very Satisfactory'
        WHEN g.final_grade >= 80 THEN 'Satisfactory'
        WHEN g.final_grade >= 75 THEN 'Fairly Satisfactory'
        ELSE 'Did Not Meet Expectations'
    END as grade_status,
    g.remarks,
    g.created_at::date as date_recorded,
    g.updated_at::date as last_updated
FROM public.grades g
JOIN public.students s ON g.student_id = s.id
ORDER BY s.year_level, s.section, s.last_name, s.first_name, g.subject, g.quarter;

-- Create a summary view for quick grade overview by student
CREATE OR REPLACE VIEW public.student_grade_summary AS
SELECT
    s.id as student_id,
    s.student_id_no,
    s.student_lrn,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    s.year_level,
    s.section,
    s.strand,
    COUNT(g.id) as total_grades_recorded,
    COUNT(CASE WHEN g.final_grade IS NOT NULL THEN 1 END) as completed_grades,
    COUNT(CASE WHEN g.final_grade IS NULL THEN 1 END) as incomplete_grades,
    ROUND(AVG(g.final_grade), 2) as overall_average,
    -- Count by quarter
    COUNT(CASE WHEN g.quarter = '1st' THEN 1 END) as q1_subjects,
    COUNT(CASE WHEN g.quarter = '2nd' THEN 1 END) as q2_subjects,
    COUNT(CASE WHEN g.quarter = '3rd' THEN 1 END) as q3_subjects,
    COUNT(CASE WHEN g.quarter = '4th' THEN 1 END) as q4_subjects,
    -- Academic performance status
    CASE
        WHEN AVG(g.final_grade) IS NULL THEN 'No Grades'
        WHEN AVG(g.final_grade) >= 90 THEN 'Outstanding'
        WHEN AVG(g.final_grade) >= 85 THEN 'Very Satisfactory'
        WHEN AVG(g.final_grade) >= 80 THEN 'Satisfactory'
        WHEN AVG(g.final_grade) >= 75 THEN 'Fairly Satisfactory'
        ELSE 'Needs Improvement'
    END as academic_status
FROM public.students s
LEFT JOIN public.grades g ON s.id = g.student_id
GROUP BY s.id, s.student_id_no, s.student_lrn, s.first_name, s.last_name, s.year_level, s.section, s.strand
ORDER BY s.year_level, s.section, s.last_name, s.first_name;

-- Create a view for subject performance analysis
CREATE OR REPLACE VIEW public.subject_performance_analysis AS
SELECT
    g.subject,
    g.quarter,
    -- Student level breakdown
    s.year_level,
    s.section,
    COUNT(*) as total_students,
    COUNT(CASE WHEN g.final_grade IS NOT NULL THEN 1 END) as graded_students,
    -- Performance statistics
    ROUND(AVG(g.written_work), 2) as avg_written_work,
    ROUND(AVG(g.performance_task), 2) as avg_performance_task,
    ROUND(AVG(g.quarterly_assessment), 2) as avg_quarterly_assessment,
    ROUND(AVG(g.final_grade), 2) as avg_final_grade,
    -- Grade distribution
    COUNT(CASE WHEN g.final_grade >= 90 THEN 1 END) as outstanding_count,
    COUNT(CASE WHEN g.final_grade >= 85 AND g.final_grade < 90 THEN 1 END) as very_satisfactory_count,
    COUNT(CASE WHEN g.final_grade >= 80 AND g.final_grade < 85 THEN 1 END) as satisfactory_count,
    COUNT(CASE WHEN g.final_grade >= 75 AND g.final_grade < 80 THEN 1 END) as fairly_satisfactory_count,
    COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) as needs_improvement_count
FROM public.grades g
JOIN public.students s ON g.student_id = s.id
WHERE g.final_grade IS NOT NULL
GROUP BY g.subject, g.quarter, s.year_level, s.section
ORDER BY s.year_level, s.section, g.subject, g.quarter;

-- Grant appropriate permissions to the views
GRANT SELECT ON public.grades_readable TO authenticated;
GRANT SELECT ON public.student_grade_summary TO authenticated;
GRANT SELECT ON public.subject_performance_analysis TO authenticated;

-- Add RLS policies for the views (they inherit from base tables but we'll be explicit)
ALTER VIEW public.grades_readable OWNER TO postgres;
ALTER VIEW public.student_grade_summary OWNER TO postgres;
ALTER VIEW public.subject_performance_analysis OWNER TO postgres;

-- Create indexes for better performance on the underlying tables
CREATE INDEX IF NOT EXISTS idx_grades_student_quarter ON public.grades(student_id, quarter);
CREATE INDEX IF NOT EXISTS idx_grades_subject_quarter ON public.grades(subject, quarter);
CREATE INDEX IF NOT EXISTS idx_students_year_section ON public.students(year_level, section);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(last_name, first_name);

-- Add a comment explaining the views
COMMENT ON VIEW public.grades_readable IS 'Readable view of grades with student information for easier browsing in Supabase dashboard';
COMMENT ON VIEW public.student_grade_summary IS 'Summary of each student''s academic performance across all subjects and quarters';
COMMENT ON VIEW public.subject_performance_analysis IS 'Analysis of subject performance by section and quarter for academic insights';