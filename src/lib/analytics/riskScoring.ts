/**
 * Multi-Factor Risk Scoring Algorithm
 * Calculates student risk level based on grades, attendance, trends, and failing subjects
 */

import type {
    StudentData,
    RiskAssessment,
    RiskLevel,
    RiskFactor
} from './types';

/**
 * Calculate comprehensive risk score for a student (0-100 scale)
 * Higher score = Higher risk
 */
export function calculateRiskScore(student: StudentData): RiskAssessment {
    let score = 0;
    const factors: RiskFactor[] = [];

    // 1. Grade Factor (40 points max)
    const avgGrade = student.averageGrade;
    if (avgGrade < 75) {
        score += 40;
        factors.push({
            type: 'grade',
            severity: 'high',
            message: 'Below passing grade (75%)',
            value: avgGrade
        });
    } else if (avgGrade < 80) {
        score += 25;
        factors.push({
            type: 'grade',
            severity: 'medium',
            message: 'Below target performance (80%)',
            value: avgGrade
        });
    } else if (avgGrade < 85) {
        score += 10;
        factors.push({
            type: 'grade',
            severity: 'low',
            message: 'Approaching target performance',
            value: avgGrade
        });
    }

    // 2. Attendance Factor (30 points max)
    const attendance = student.attendanceRate;
    if (attendance < 75) {
        score += 30;
        factors.push({
            type: 'attendance',
            severity: 'high',
            message: 'Chronic absenteeism (below 75%)',
            value: attendance
        });
    } else if (attendance < 85) {
        score += 20;
        factors.push({
            type: 'attendance',
            severity: 'medium',
            message: 'Frequent absences (below 85%)',
            value: attendance
        });
    } else if (attendance < 90) {
        score += 10;
        factors.push({
            type: 'attendance',
            severity: 'low',
            message: 'Occasional absences',
            value: attendance
        });
    }

    // 3. Trend Factor (20 points max)
    if (student.trend === 'declining') {
        score += 20;
        factors.push({
            type: 'trend',
            severity: 'high',
            message: 'Grades are declining over time'
        });
    } else if (student.trend === 'stable' && avgGrade < 80) {
        score += 10;
        factors.push({
            type: 'trend',
            severity: 'medium',
            message: 'No improvement shown despite low performance'
        });
    }

    // 4. Failing Subjects Factor (10 points max)
    const failingSubjects = student.grades
        .filter(g => g.finalGrade < 75)
        .map(g => ({ subject: g.subject, grade: g.finalGrade }));

    const failingCount = failingSubjects.length;

    if (failingCount >= 3) {
        score += 10;
        factors.push({
            type: 'subjects',
            severity: 'high',
            message: `Failing ${failingCount} subjects`,
            value: failingCount,
        });
    } else if (failingCount > 0) {
        score += 5;
        factors.push({
            type: 'subjects',
            severity: 'medium',
            message: `Struggling in ${failingCount} subject(s)`,
            value: failingCount,
        });
    }

    const level = getRiskLevel(score);
    const summary = generateRiskSummary(student, level, factors);
    // Pass failingSubjects to recommendation generator
    const recommendations = generateRecommendations(factors, avgGrade, attendance, failingSubjects);

    return {
        score,
        level,
        factors,
        summary,
        recommendations,
        failingSubjects
    };
}

/**
 * Convert numeric risk score to risk level
 */
export function getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

/**
 * Generate human-readable risk summary
 */
function generateRiskSummary(
    student: StudentData,
    level: RiskLevel,
    factors: RiskFactor[]
): string {
    const avgGrade = student.averageGrade.toFixed(1);
    const attendance = student.attendanceRate.toFixed(1);

    if (level === 'high') {
        const primaryIssue = factors.find(f => f.severity === 'high');
        if (primaryIssue?.type === 'grade') {
            return `Needs immediate attention - average grade is ${avgGrade}% (below passing)`;
        } else if (primaryIssue?.type === 'attendance') {
            return `Chronic absenteeism detected - attendance rate of ${attendance}% is critically low`;
        } else {
            return `Multiple risk factors identified - immediate intervention recommended`;
        }
    } else if (level === 'medium') {
        if (student.trend === 'declining') {
            return `Performance is declining - current average ${avgGrade}% requires monitoring`;
        } else {
            return `Below target performance - average grade ${avgGrade}% needs improvement`;
        }
    } else {
        if (factors.length > 0) {
            return `Generally on track but ${attendance}% attendance could be improved`;
        }
        return `Performing well - continue current effort`;
    }
}

/**
 * Generate actionable recommendations based on risk factors
 */
function generateRecommendations(
    factors: RiskFactor[],
    avgGrade: number,
    attendance: number,
    failingSubjects: { subject: string; grade: number }[] = []
): string[] {
    const recommendations: string[] = [];

    // Grade-based recommendations
    const gradeFactor = factors.find(f => f.type === 'grade');
    if (gradeFactor) {
        if (gradeFactor.severity === 'high') {
            recommendations.push('Schedule immediate tutoring sessions');
            recommendations.push('Conduct parent-teacher conference');
        } else if (gradeFactor.severity === 'medium') {
            recommendations.push('Consider additional tutoring support');
            recommendations.push('Review study habits and time management');
        } else {
            recommendations.push('Encourage continued effort to reach 85% target');
        }
    }

    // Attendance-based recommendations
    const attendanceFactor = factors.find(f => f.type === 'attendance');
    if (attendanceFactor) {
        if (attendanceFactor.severity === 'high') {
            recommendations.push('Urgent parent meeting to address absenteeism');
            recommendations.push('Investigate underlying causes of absences');
        } else if (attendanceFactor.severity === 'medium') {
            recommendations.push('Monitor attendance closely');
            recommendations.push('Communicate importance of regular attendance');
        } else {
            recommendations.push('Encourage consistent attendance');
        }
    }

    // Trend-based recommendations
    const trendFactor = factors.find(f => f.type === 'trend');
    if (trendFactor) {
        recommendations.push('Weekly progress check-ins recommended');
        recommendations.push('Identify and address causes of declining performance');
    }

    // Subject-specific recommendations
    if (failingSubjects.length > 0) {
        failingSubjects.forEach(f => {
            recommendations.push(`Review ${f.subject} fundamentals (Grade: ${f.grade})`);
            recommendations.push(`Schedule consultation with ${f.subject} teacher`);
        });
    } else {
        // Fallback to factor-based if no array passed (legacy safety)
        const subjectFactor = factors.find(f => f.type === 'subjects');
        if (subjectFactor && subjectFactor.value && subjectFactor.value > 0) {
            recommendations.push(`Focus tutoring on ${subjectFactor.value} struggling subject(s)`);
        }
    }

    // Default recommendations if no specific issues
    if (recommendations.length === 0) {
        recommendations.push('Maintain current performance level');
        recommendations.push('Continue regular study habits');
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
}

/**
 * Get detailed breakdown of risk factors
 */
export function getRiskFactorBreakdown(student: StudentData): {
    gradeRisk: number;
    attendanceRisk: number;
    trendRisk: number;
    subjectRisk: number;
} {
    const assessment = calculateRiskScore(student);

    return {
        gradeRisk: assessment.factors.find(f => f.type === 'grade')?.value || 0,
        attendanceRisk: assessment.factors.find(f => f.type === 'attendance')?.value || 0,
        trendRisk: student.trend === 'declining' ? 20 : student.trend === 'stable' && student.averageGrade < 80 ? 10 : 0,
        subjectRisk: assessment.factors.find(f => f.type === 'subjects')?.value || 0
    };
}
