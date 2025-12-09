-- Fix the at-risk student criteria to be more realistic
-- The current criteria is too strict - including all students below 85 average

-- Update the at-risk students view with better criteria
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
    -- Only include students with ACTUAL risk factors - much more realistic criteria
    (
        -- High risk: Below 75 average (failing)
        spt.overall_average < 75
        OR
        -- Medium risk: Multiple failing subjects regardless of average
        spt.failing_grades >= 2
        OR
        -- Attendance issues: Below 80% attendance
        (att.total_days > 0 AND (att.present_days::decimal / att.total_days) < 0.80)
        OR
        -- Performance decline: Significantly declining trend
        spt.q1_to_q2_trend = 'Declining'
        OR
        -- Very low average with any failing subject (below 80 with failing grades)
        (spt.overall_average < 80 AND spt.failing_grades > 0)
    );

-- Update the student performance trends view to have better risk level classification
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

    -- Updated risk indicators - more realistic
    CASE
        WHEN AVG(g.final_grade) < 75 THEN 'High Risk'
        WHEN (AVG(g.final_grade) < 80 AND COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) >= 2) THEN 'Medium Risk'
        WHEN (AVG(g.final_grade) < 80 AND COUNT(CASE WHEN g.final_grade < 75 THEN 1 END) >= 1) THEN 'Low Risk'
        ELSE 'On Track'
    END as risk_level

FROM public.students s
LEFT JOIN public.grades g ON s.id = g.student_id
GROUP BY s.id, s.student_id_no, s.student_lrn, s.first_name, s.last_name, s.year_level, s.section, s.strand
ORDER BY s.year_level, s.section, s.last_name, s.first_name;

-- Add helpful comments
COMMENT ON VIEW public.at_risk_students IS 'Identifies students at genuine risk - updated criteria to be more realistic and avoid false positives';
COMMENT ON VIEW public.student_performance_trends IS 'Student performance trends with improved risk level classification';