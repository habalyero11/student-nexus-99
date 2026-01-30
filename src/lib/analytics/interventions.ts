/**
 * Intervention Recommendations Engine
 * Generates actionable recommendations based on risk factors
 */

import type { RiskFactor, Intervention } from './types';

const PRIORITY_WEIGHT = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4
};

/**
 * Generate prioritized intervention recommendations
 */
export function generateInterventions(
    factors: RiskFactor[],
    averageGrade: number,
    attendanceRate: number
): Intervention[] {
    const interventions: Intervention[] = [];

    // Process each risk factor
    factors.forEach(factor => {
        switch (factor.type) {
            case 'grade':
                interventions.push(...getGradeInterventions(factor, averageGrade));
                break;
            case 'attendance':
                interventions.push(...getAttendanceInterventions(factor, attendanceRate));
                break;
            case 'trend':
                interventions.push(...getTrendInterventions(factor));
                break;
            case 'subjects':
                interventions.push(...getSubjectInterventions(factor));
                break;
        }
    });

    // Add default recommendations if no specific issues
    if (interventions.length === 0) {
        interventions.push({
            priority: 'low',
            type: 'monitoring',
            action: 'Continue current performance',
            details: 'Maintain regular study habits and attendance'
        });
    }

    // Sort by priority and limit to top 5
    return interventions
        .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
        .slice(0, 5);
}

function getGradeInterventions(factor: RiskFactor, avgGrade: number): Intervention[] {
    const interventions: Intervention[] = [];

    if (factor.severity === 'high') {
        interventions.push({
            priority: 'urgent',
            type: 'academic',
            action: 'Schedule immediate tutoring sessions',
            details: `Focus on core subjects - current average is ${avgGrade.toFixed(1)}%`
        });

        interventions.push({
            priority: 'urgent',
            type: 'support',
            action: 'Conduct parent-teacher conference',
            details: 'Discuss academic performance and create improvement plan'
        });
    } else if (factor.severity === 'medium') {
        interventions.push({
            priority: 'high',
            type: 'academic',
            action: 'Arrange peer tutoring or study groups',
            details: 'Target subjects where student is below 80%'
        });

        interventions.push({
            priority: 'high',
            type: 'monitoring',
            action: 'Bi-weekly progress monitoring',
            details: 'Track improvement in targeted subjects'
        });
    } else {
        interventions.push({
            priority: 'medium',
            type: 'academic',
            action: 'Encourage continued effort',
            details: 'Provide resources to reach 85% target'
        });
    }

    return interventions;
}

function getAttendanceInterventions(factor: RiskFactor, attendance: number): Intervention[] {
    const interventions: Intervention[] = [];

    if (factor.severity === 'high') {
        interventions.push({
            priority: 'urgent',
            type: 'behavioral',
            action: 'Urgent parent meeting required',
            details: `Address chronic absenteeism - current rate is ${attendance.toFixed(1)}%`
        });

        interventions.push({
            priority: 'urgent',
            type: 'support',
            action: 'Investigate underlying causes',
            details: 'Assess for health, transportation, or family issues'
        });
    } else if (factor.severity === 'medium') {
        interventions.push({
            priority: 'high',
            type: 'behavioral',
            action: 'Contact parents about attendance',
            details: `Current attendance rate of ${attendance.toFixed(1)}% needs improvement`
        });

        interventions.push({
            priority: 'high',
            type: 'monitoring',
            action: 'Daily attendance tracking',
            details: 'Monitor patterns and identify barriers'
        });
    } else {
        interventions.push({
            priority: 'medium',
            type: 'behavioral',
            action: 'Encourage consistent attendance',
            details: 'Reinforce importance of regular school attendance'
        });
    }

    return interventions;
}

function getTrendInterventions(factor: RiskFactor): Intervention[] {
    const interventions: Intervention[] = [];

    interventions.push({
        priority: 'high',
        type: 'monitoring',
        action: 'Weekly progress check-ins',
        details: 'Monitor grade trajectory and identify causes of decline'
    });

    interventions.push({
        priority: 'high',
        type: 'academic',
        action: 'Review recent assessments',
        details: 'Identify specific areas where performance is dropping'
    });

    return interventions;
}

function getSubjectInterventions(factor: RiskFactor): Intervention[] {
    const interventions: Intervention[] = [];

    if (factor.value && factor.value >= 3) {
        interventions.push({
            priority: 'urgent',
            type: 'academic',
            action: 'Intensive subject-specific tutoring',
            details: `Focus on ${factor.value} failing subjects immediately`
        });
    } else if (factor.value && factor.value > 0) {
        interventions.push({
            priority: 'high',
            type: 'academic',
            action: 'Targeted subject support',
            details: `Provide additional help in ${factor.value} struggling subject(s)`
        });
    }

    return interventions;
}

/**
 * Get intervention summary for display
 */
export function getInterventionSummary(interventions: Intervention[]): string {
    const urgent = interventions.filter(i => i.priority === 'urgent').length;
    const high = interventions.filter(i => i.priority === 'high').length;

    if (urgent > 0) {
        return `${urgent} urgent intervention(s) needed`;
    } else if (high > 0) {
        return `${high} high-priority recommendation(s)`;
    } else if (interventions.length > 0) {
        return `${interventions.length} recommendation(s) available`;
    }

    return 'No interventions needed - student on track';
}
