/**
 * Shared TypeScript types for the analytics system
 */

export interface StudentData {
    id: string;
    name: string;
    yearLevel: string;
    section: string;
    strand?: string;
    averageGrade: number;
    attendanceRate: number;
    trend: 'improving' | 'declining' | 'stable';
    grades: GradeData[];
}

export interface GradeData {
    subject: string;
    quarter: string;
    writtenWork: number | null;
    performanceTask: number | null;
    quarterlyAssessment: number | null;
    finalGrade: number;
}

export type RiskLevel = 'high' | 'medium' | 'low';
export type RiskFactorType = 'grade' | 'attendance' | 'trend' | 'subjects';
export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskFactor {
    type: RiskFactorType;
    severity: RiskSeverity;
    message: string;
    value?: number;
}

export interface RiskAssessment {
    score: number; // 0-100
    level: RiskLevel;
    factors: RiskFactor[];
    summary: string;
    recommendations: string[];
    failingSubjects: { subject: string; grade: number }[];
}

export interface RemarksParams {
    studentName: string;
    subject: string;
    quarter: string;
    scores: {
        writtenWork: number | null;
        performanceTask: number | null;
        quarterlyAssessment: number | null;
        finalGrade: number;
    };
    yearLevel: string;
    section: string;
    historicalGrades?: number[];
}

export interface ComponentAnalysis {
    strongest: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment';
    weakest: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment';
    hasStrength: boolean;
    hasWeakness: boolean;
    isBalanced: boolean;
}

export type PerformanceLevel =
    | 'outstanding'
    | 'very_satisfactory'
    | 'satisfactory'
    | 'fairly_satisfactory'
    | 'needs_improvement';

export interface Intervention {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    type: 'academic' | 'behavioral' | 'monitoring' | 'support';
    action: string;
    details: string;
}
