-- Update analytics views to support subject-based advisor filtering
-- This allows advisors to see analytics only for students in subjects they teach

-- Create a helper function to get advisor's assigned student IDs for specific subjects
CREATE OR REPLACE FUNCTION get_advisor_students_for_subjects(advisor_profile_id uuid, subject_filter text[] DEFAULT NULL)
RETURNS TABLE(student_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT s.id
    FROM public.students s
    JOIN public.advisor_assignments aa ON (
        s.year_level = aa.year_level
        AND s.section = aa.section
        AND (s.strand = aa.strand OR (s.strand IS NULL AND aa.strand IS NULL))
    )
    JOIN public.advisors a ON aa.advisor_id = a.id
    WHERE a.profile_id = advisor_profile_id
    AND (subject_filter IS NULL OR aa.subjects && subject_filter);
END;
$$ LANGUAGE plpgsql;

-- Create a view for advisor-specific at-risk students (filtered by subjects)
CREATE OR REPLACE VIEW public.advisor_at_risk_students AS
SELECT
    ars.*,
    aa.advisor_id,
    a.profile_id as advisor_profile_id,
    aa.subjects as advisor_subjects
FROM public.at_risk_students ars
JOIN public.students s ON ars.student_id = s.id
JOIN public.advisor_assignments aa ON (
    s.year_level = aa.year_level
    AND s.section = aa.section
    AND (s.strand = aa.strand OR (s.strand IS NULL AND aa.strand IS NULL))
)
JOIN public.advisors a ON aa.advisor_id = a.id;

-- Create a view for advisor-specific grade analytics (filtered by subjects)
CREATE OR REPLACE VIEW public.advisor_grade_analytics AS
SELECT
    a.profile_id as advisor_profile_id,
    aa.year_level,
    aa.section,
    aa.strand,
    unnest(aa.subjects) as subject,
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT g.id) as total_grades,
    AVG(g.final_grade) as average_grade,
    COUNT(CASE WHEN g.final_grade >= 90 THEN 1 END) as outstanding_count,
    COUNT(CASE WHEN g.final_grade >= 85 AND g.final_grade < 90 THEN 1 END) as very_satisfactory_count,
    COUNT(CASE WHEN g.final_grade >= 80 AND g.final_grade < 85 THEN 1 END) as satisfactory_count,
    COUNT(CASE WHEN g.final_grade >= 75 AND g.final_grade < 80 THEN 1 END) as fairly_satisfactory_count,
    COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) as needs_improvement_count,
    COUNT(CASE WHEN g.final_grade IS NULL THEN 1 END) as incomplete_count
FROM public.advisor_assignments aa
JOIN public.advisors a ON aa.advisor_id = a.id
JOIN public.students s ON (
    s.year_level = aa.year_level
    AND s.section = aa.section
    AND (s.strand = aa.strand OR (s.strand IS NULL AND aa.strand IS NULL))
)
LEFT JOIN public.grades g ON (
    g.student_id = s.id
    AND g.subject = ANY(aa.subjects)
)
GROUP BY a.profile_id, aa.year_level, aa.section, aa.strand, unnest(aa.subjects);

-- Update the section performance analytics to include subject breakdown
CREATE OR REPLACE VIEW public.advisor_section_performance AS
SELECT
    a.profile_id as advisor_profile_id,
    aa.year_level,
    aa.section,
    aa.strand,
    aa.subjects,

    -- Student counts for this section
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT CASE WHEN ars.student_id IS NOT NULL THEN ars.student_id END) as students_with_risk,

    -- Performance distribution across advisor's subjects
    COUNT(DISTINCT CASE WHEN spt.overall_average >= 90 THEN s.id END) as outstanding_students,
    COUNT(DISTINCT CASE WHEN spt.overall_average >= 85 AND spt.overall_average < 90 THEN s.id END) as very_satisfactory_students,
    COUNT(DISTINCT CASE WHEN spt.overall_average >= 80 AND spt.overall_average < 85 THEN s.id END) as satisfactory_students,
    COUNT(DISTINCT CASE WHEN spt.overall_average >= 75 AND spt.overall_average < 80 THEN s.id END) as fairly_satisfactory_students,
    COUNT(DISTINCT CASE WHEN spt.overall_average < 75 THEN s.id END) as needs_improvement_students,

    -- Risk level distribution
    COUNT(DISTINCT CASE WHEN ars.risk_level = 'High Risk' THEN ars.student_id END) as high_risk_count,
    COUNT(DISTINCT CASE WHEN ars.risk_level = 'Medium Risk' THEN ars.student_id END) as medium_risk_count,
    COUNT(DISTINCT CASE WHEN ars.risk_level = 'Low Risk' THEN ars.student_id END) as low_risk_count,

    -- Average metrics for advisor's subjects only
    ROUND(AVG(CASE WHEN g.subject = ANY(aa.subjects) THEN g.final_grade END), 2) as section_average_for_subjects,
    ROUND(AVG(att.attendance_rate), 2) as average_attendance_rate,
    ROUND(AVG(ars.risk_score), 2) as average_risk_score,

    -- Trend analysis for advisor's subjects
    COUNT(DISTINCT CASE WHEN spt.q1_to_q2_trend = 'Improving' THEN s.id END) as improving_students,
    COUNT(DISTINCT CASE WHEN spt.q1_to_q2_trend = 'Declining' THEN s.id END) as declining_students,
    COUNT(DISTINCT CASE WHEN spt.q1_to_q2_trend = 'Stable' THEN s.id END) as stable_students,

    -- Section health indicator based on advisor's subjects
    CASE
        WHEN COUNT(DISTINCT CASE WHEN ars.risk_level = 'High Risk' THEN ars.student_id END) > (COUNT(DISTINCT s.id) * 0.2) THEN 'Needs Attention'
        WHEN COUNT(DISTINCT CASE WHEN ars.risk_level IN ('High Risk', 'Medium Risk') THEN ars.student_id END) > (COUNT(DISTINCT s.id) * 0.3) THEN 'Monitor Closely'
        WHEN AVG(CASE WHEN g.subject = ANY(aa.subjects) THEN g.final_grade END) >= 85 THEN 'Excellent'
        WHEN AVG(CASE WHEN g.subject = ANY(aa.subjects) THEN g.final_grade END) >= 80 THEN 'Good'
        ELSE 'Average'
    END as section_health

FROM public.advisor_assignments aa
JOIN public.advisors a ON aa.advisor_id = a.id
JOIN public.students s ON (
    s.year_level = aa.year_level
    AND s.section = aa.section
    AND (s.strand = aa.strand OR (s.strand IS NULL AND aa.strand IS NULL))
)
LEFT JOIN public.grades g ON g.student_id = s.id
LEFT JOIN public.student_performance_trends spt ON s.id = spt.student_id
LEFT JOIN public.at_risk_students ars ON s.id = ars.student_id
LEFT JOIN (
    SELECT
        student_id,
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::decimal / COUNT(*)) * 100, 2) as attendance_rate
    FROM public.attendance
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY student_id
) att ON s.id = att.student_id
GROUP BY a.profile_id, aa.year_level, aa.section, aa.strand, aa.subjects
ORDER BY aa.year_level, aa.section;

-- Create a function to get available subjects for an advisor based on their assignments
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

-- Grant permissions to the new views and functions
GRANT SELECT ON public.advisor_at_risk_students TO authenticated;
GRANT SELECT ON public.advisor_grade_analytics TO authenticated;
GRANT SELECT ON public.advisor_section_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_advisor_students_for_subjects(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_advisor_available_subjects(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON VIEW public.advisor_at_risk_students IS 'At-risk students filtered by advisor assignments including subject filtering';
COMMENT ON VIEW public.advisor_grade_analytics IS 'Grade analytics broken down by advisor, section, and subject';
COMMENT ON VIEW public.advisor_section_performance IS 'Section performance analytics filtered by advisor assigned subjects';
COMMENT ON FUNCTION get_advisor_students_for_subjects(uuid, text[]) IS 'Returns student IDs for an advisor filtered by optional subjects';
COMMENT ON FUNCTION get_advisor_available_subjects(uuid) IS 'Returns all subjects assigned to an advisor across all their assignments';