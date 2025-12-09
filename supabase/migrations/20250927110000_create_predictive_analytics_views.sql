-- Create comprehensive predictive analytics views for student performance analysis
-- This migration provides data foundation for identifying at-risk students and performance insights

-- 1. Student Performance Trends View
-- Tracks performance changes over quarters to identify declining students
CREATE OR REPLACE VIEW public.student_performance_trends AS
SELECT
    s.id as student_id,
    s.student_id_no,
    s.student_lrn,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    s.year_level,
    s.section,
    s.strand,

    -- Quarter-by-quarter performance
    AVG(CASE WHEN g.quarter = '1st' THEN g.final_grade END) as q1_average,
    AVG(CASE WHEN g.quarter = '2nd' THEN g.final_grade END) as q2_average,
    AVG(CASE WHEN g.quarter = '3rd' THEN g.final_grade END) as q3_average,
    AVG(CASE WHEN g.quarter = '4th' THEN g.final_grade END) as q4_average,

    -- Overall performance metrics
    AVG(g.final_grade) as overall_average,
    COUNT(g.id) as total_grades,
    COUNT(CASE WHEN g.final_grade IS NOT NULL THEN 1 END) as completed_grades,
    COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) as failing_grades,

    -- Performance trend analysis
    CASE
        WHEN AVG(CASE WHEN g.quarter = '2nd' THEN g.final_grade END) - AVG(CASE WHEN g.quarter = '1st' THEN g.final_grade END) < -5
        THEN 'Declining'
        WHEN AVG(CASE WHEN g.quarter = '2nd' THEN g.final_grade END) - AVG(CASE WHEN g.quarter = '1st' THEN g.final_grade END) > 5
        THEN 'Improving'
        ELSE 'Stable'
    END as q1_to_q2_trend,

    -- Risk indicators
    CASE
        WHEN AVG(g.final_grade) < 75 THEN 'High Risk'
        WHEN AVG(g.final_grade) < 80 AND COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) > 0 THEN 'Medium Risk'
        WHEN AVG(g.final_grade) < 85 THEN 'Low Risk'
        ELSE 'On Track'
    END as risk_level

FROM public.students s
LEFT JOIN public.grades g ON s.id = g.student_id
GROUP BY s.id, s.student_id_no, s.student_lrn, s.first_name, s.last_name, s.year_level, s.section, s.strand;

-- 2. At-Risk Students Identification View
-- Comprehensive at-risk student identification with multiple criteria
CREATE OR REPLACE VIEW public.at_risk_students AS
SELECT
    spt.*,

    -- Attendance data (if available)
    COALESCE(att.total_days, 0) as total_attendance_days,
    COALESCE(att.present_days, 0) as present_days,
    COALESCE(att.absent_days, 0) as absent_days,
    CASE
        WHEN att.total_days > 0 THEN ROUND((att.present_days::decimal / att.total_days) * 100, 2)
        ELSE 0
    END as attendance_rate,

    -- Risk scoring (0-100, higher = more at risk)
    LEAST(100, GREATEST(0,
        -- Academic performance factor (40% weight)
        CASE
            WHEN spt.overall_average < 75 THEN 40
            WHEN spt.overall_average < 80 THEN 25
            WHEN spt.overall_average < 85 THEN 10
            ELSE 0
        END +
        -- Failing subjects factor (30% weight)
        CASE
            WHEN spt.failing_grades >= 3 THEN 30
            WHEN spt.failing_grades >= 2 THEN 20
            WHEN spt.failing_grades >= 1 THEN 10
            ELSE 0
        END +
        -- Attendance factor (20% weight)
        CASE
            WHEN att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.75 THEN 20
            WHEN att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.85 THEN 10
            ELSE 0
        END +
        -- Trend factor (10% weight)
        CASE
            WHEN spt.q1_to_q2_trend = 'Declining' THEN 10
            ELSE 0
        END
    )) as risk_score,

    -- Primary concern identification
    CASE
        WHEN spt.overall_average < 75 AND spt.failing_grades >= 2 THEN 'Academic Performance'
        WHEN att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.75 THEN 'Attendance Issues'
        WHEN spt.q1_to_q2_trend = 'Declining' THEN 'Performance Decline'
        WHEN spt.failing_grades >= 1 THEN 'Subject-Specific Struggles'
        ELSE 'General Monitoring'
    END as primary_concern,

    -- Recommended actions
    CASE
        WHEN spt.overall_average < 75 AND spt.failing_grades >= 2 THEN 'Immediate intervention required'
        WHEN att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.75 THEN 'Attendance counseling needed'
        WHEN spt.q1_to_q2_trend = 'Declining' THEN 'Monitor closely and provide support'
        WHEN spt.failing_grades >= 1 THEN 'Subject-specific tutoring'
        ELSE 'Continue regular monitoring'
    END as recommended_action

FROM public.student_performance_trends spt
LEFT JOIN (
    SELECT
        student_id,
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days
    FROM public.attendance
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY student_id
) att ON spt.student_id = att.student_id
WHERE
    -- Only include students with actual risk factors
    (spt.overall_average < 85 OR spt.failing_grades > 0 OR spt.q1_to_q2_trend = 'Declining' OR
     (att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.85));

-- 3. Section Performance Analytics View
-- For advisor-specific insights on their assigned sections
CREATE OR REPLACE VIEW public.section_performance_analytics AS
SELECT
    s.year_level,
    s.section,
    s.strand,

    -- Student counts
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT ars.student_id) as students_with_risk,

    -- Performance distribution
    COUNT(CASE WHEN spt.overall_average >= 90 THEN 1 END) as outstanding_students,
    COUNT(CASE WHEN spt.overall_average >= 85 AND spt.overall_average < 90 THEN 1 END) as very_satisfactory_students,
    COUNT(CASE WHEN spt.overall_average >= 80 AND spt.overall_average < 85 THEN 1 END) as satisfactory_students,
    COUNT(CASE WHEN spt.overall_average >= 75 AND spt.overall_average < 80 THEN 1 END) as fairly_satisfactory_students,
    COUNT(CASE WHEN spt.overall_average < 75 THEN 1 END) as needs_improvement_students,

    -- Risk level distribution
    COUNT(CASE WHEN ars.risk_level = 'High Risk' THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN ars.risk_level = 'Medium Risk' THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN ars.risk_level = 'Low Risk' THEN 1 END) as low_risk_count,

    -- Average metrics
    ROUND(AVG(spt.overall_average), 2) as section_average,
    ROUND(AVG(ars.attendance_rate), 2) as average_attendance_rate,
    ROUND(AVG(ars.risk_score), 2) as average_risk_score,

    -- Trend analysis
    COUNT(CASE WHEN spt.q1_to_q2_trend = 'Improving' THEN 1 END) as improving_students,
    COUNT(CASE WHEN spt.q1_to_q2_trend = 'Declining' THEN 1 END) as declining_students,
    COUNT(CASE WHEN spt.q1_to_q2_trend = 'Stable' THEN 1 END) as stable_students,

    -- Section health indicator
    CASE
        WHEN COUNT(CASE WHEN ars.risk_level = 'High Risk' THEN 1 END) > (COUNT(DISTINCT s.id) * 0.2) THEN 'Needs Attention'
        WHEN COUNT(CASE WHEN ars.risk_level IN ('High Risk', 'Medium Risk') THEN 1 END) > (COUNT(DISTINCT s.id) * 0.3) THEN 'Monitor Closely'
        WHEN AVG(spt.overall_average) >= 85 THEN 'Excellent'
        WHEN AVG(spt.overall_average) >= 80 THEN 'Good'
        ELSE 'Average'
    END as section_health

FROM public.students s
LEFT JOIN public.student_performance_trends spt ON s.id = spt.student_id
LEFT JOIN public.at_risk_students ars ON s.id = ars.student_id
GROUP BY s.year_level, s.section, s.strand
ORDER BY s.year_level, s.section;

-- 4. Overall System Analytics View (for admin dashboard)
CREATE OR REPLACE VIEW public.system_performance_analytics AS
SELECT
    -- Overall system metrics
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT CASE WHEN ars.student_id IS NOT NULL THEN ars.student_id END) as at_risk_students,
    ROUND(
        (COUNT(DISTINCT CASE WHEN ars.student_id IS NOT NULL THEN ars.student_id END)::decimal /
         NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 2
    ) as at_risk_percentage,

    -- Performance distribution
    COUNT(CASE WHEN spt.overall_average >= 90 THEN 1 END) as outstanding_count,
    COUNT(CASE WHEN spt.overall_average >= 85 AND spt.overall_average < 90 THEN 1 END) as very_satisfactory_count,
    COUNT(CASE WHEN spt.overall_average >= 80 AND spt.overall_average < 85 THEN 1 END) as satisfactory_count,
    COUNT(CASE WHEN spt.overall_average >= 75 AND spt.overall_average < 80 THEN 1 END) as fairly_satisfactory_count,
    COUNT(CASE WHEN spt.overall_average < 75 THEN 1 END) as needs_improvement_count,

    -- Risk distribution
    COUNT(CASE WHEN ars.risk_level = 'High Risk' THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN ars.risk_level = 'Medium Risk' THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN ars.risk_level = 'Low Risk' THEN 1 END) as low_risk_count,

    -- System averages
    ROUND(AVG(spt.overall_average), 2) as system_average_grade,
    ROUND(AVG(ars.attendance_rate), 2) as system_average_attendance,
    ROUND(AVG(ars.risk_score), 2) as system_average_risk_score,

    -- Trend indicators
    COUNT(CASE WHEN spt.q1_to_q2_trend = 'Improving' THEN 1 END) as improving_students,
    COUNT(CASE WHEN spt.q1_to_q2_trend = 'Declining' THEN 1 END) as declining_students,

    -- System health indicator
    CASE
        WHEN COUNT(CASE WHEN ars.risk_level = 'High Risk' THEN 1 END) > (COUNT(DISTINCT s.id) * 0.15) THEN 'Critical'
        WHEN COUNT(CASE WHEN ars.risk_level IN ('High Risk', 'Medium Risk') THEN 1 END) > (COUNT(DISTINCT s.id) * 0.25) THEN 'Needs Attention'
        WHEN AVG(spt.overall_average) >= 85 THEN 'Excellent'
        WHEN AVG(spt.overall_average) >= 80 THEN 'Good'
        ELSE 'Average'
    END as system_health

FROM public.students s
LEFT JOIN public.student_performance_trends spt ON s.id = spt.student_id
LEFT JOIN public.at_risk_students ars ON s.id = ars.student_id;

-- Grant permissions to the views
GRANT SELECT ON public.student_performance_trends TO authenticated;
GRANT SELECT ON public.at_risk_students TO authenticated;
GRANT SELECT ON public.section_performance_analytics TO authenticated;
GRANT SELECT ON public.system_performance_analytics TO authenticated;

-- Set view ownership
ALTER VIEW public.student_performance_trends OWNER TO postgres;
ALTER VIEW public.at_risk_students OWNER TO postgres;
ALTER VIEW public.section_performance_analytics OWNER TO postgres;
ALTER VIEW public.system_performance_analytics OWNER TO postgres;

-- Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grades_quarter_final ON public.grades(quarter, final_grade) WHERE final_grade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date, status);
CREATE INDEX IF NOT EXISTS idx_students_year_section_strand ON public.students(year_level, section, strand);

-- Add helpful comments
COMMENT ON VIEW public.student_performance_trends IS 'Tracks individual student performance trends across quarters for predictive analysis';
COMMENT ON VIEW public.at_risk_students IS 'Identifies students at risk of academic failure with scoring and recommendations';
COMMENT ON VIEW public.section_performance_analytics IS 'Provides section-level performance analytics for advisor dashboards';
COMMENT ON VIEW public.system_performance_analytics IS 'Provides system-wide performance metrics for admin dashboard';