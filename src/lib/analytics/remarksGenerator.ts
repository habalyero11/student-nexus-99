/**
 * Smart Template-Based Remarks Generator
 * Generates personalized, context-aware remarks for student grades
 */

import type {
    RemarksParams,
    PerformanceLevel,
    ComponentAnalysis
} from './types';

/**
 * Main function to generate personalized remarks
 */
export function generateRemarks(params: RemarksParams): string {
    const { subject, scores, yearLevel } = params;
    const { writtenWork, performanceTask, quarterlyAssessment, finalGrade } = scores;

    // 1. Determine performance level
    const level = getPerformanceLevel(finalGrade);

    // 2. Analyze component strengths/weaknesses
    const analysis = analyzeComponents({
        writtenWork: writtenWork || 0,
        performanceTask: performanceTask || 0,
        quarterlyAssessment: quarterlyAssessment || 0
    });

    // 3. Get base remark template
    let remark = getBaseRemark(level, subject);

    // 4. Add component-specific insights
    if (analysis.hasStrength && finalGrade >= 85) {
        remark += ` ${getStrengthPhrase(analysis.strongest, subject)}`;
    }

    if (analysis.hasWeakness && finalGrade < 85) {
        remark += ` ${getImprovementPhrase(analysis.weakest, subject)}`;
    }

    // 5. Add trend-based advice if historical data available
    if (params.historicalGrades && params.historicalGrades.length > 0) {
        const trend = detectSimpleTrend(params.historicalGrades, finalGrade);
        remark += ` ${getTrendPhrase(trend, finalGrade)}`;
    }

    return remark.trim();
}

/**
 * Determine performance level based on final grade
 */
function getPerformanceLevel(grade: number): PerformanceLevel {
    if (grade >= 90) return 'outstanding';
    if (grade >= 85) return 'very_satisfactory';
    if (grade >= 80) return 'satisfactory';
    if (grade >= 75) return 'fairly_satisfactory';
    return 'needs_improvement';
}

/**
 * Analyze component scores to identify strengths and weaknesses
 */
function analyzeComponents(components: {
    writtenWork: number;
    performanceTask: number;
    quarterlyAssessment: number;
}): ComponentAnalysis {
    const { writtenWork, performanceTask, quarterlyAssessment } = components;

    // Find strongest and weakest components
    const scores = {
        writtenWork,
        performanceTask,
        quarterlyAssessment
    };

    const entries = Object.entries(scores) as [keyof typeof scores, number][];
    entries.sort((a, b) => b[1] - a[1]);

    const strongest = entries[0][0];
    const weakest = entries[2][0];

    // Determine if there's a significant difference (>10 points)
    const hasStrength = scores[strongest] - scores[weakest] >= 10;
    const hasWeakness = scores[strongest] - scores[weakest] >= 10;
    const isBalanced = scores[strongest] - scores[weakest] < 5;

    return {
        strongest,
        weakest,
        hasStrength,
        hasWeakness,
        isBalanced
    };
}

/**
 * Get base remark template based on performance level and subject
 */
function getBaseRemark(level: PerformanceLevel, subject: string): string {
    const templates = REMARK_TEMPLATES[level];

    // Try to get subject-specific template
    if (templates[subject]) {
        return getRandomElement(templates[subject]);
    }

    // Fall back to general template
    return getRandomElement(templates.general);
}

/**
 * Get phrase highlighting student's strength
 */
function getStrengthPhrase(
    component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment',
    subject: string
): string {
    const phrases = {
        writtenWork: [
            'Shows excellent written comprehension.',
            'Demonstrates strong analytical writing skills.',
            'Excels in written assessments.'
        ],
        performanceTask: [
            'Demonstrates excellent practical application.',
            'Shows outstanding hands-on skills.',
            'Excels in performance-based activities.'
        ],
        quarterlyAssessment: [
            'Performs exceptionally well in comprehensive assessments.',
            'Shows strong test-taking abilities.',
            'Demonstrates excellent retention and understanding.'
        ]
    };

    return getRandomElement(phrases[component]);
}

/**
 * Get phrase suggesting improvement area
 */
function getImprovementPhrase(
    component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment',
    subject: string
): string {
    const phrases = {
        writtenWork: [
            'Would benefit from additional practice in written work.',
            'Consider focusing more on written assessments.',
            'Additional support in written tasks recommended.'
        ],
        performanceTask: [
            'Hands-on practice would help improve performance tasks.',
            'Consider more engagement in practical activities.',
            'Additional support in performance-based work recommended.'
        ],
        quarterlyAssessment: [
            'Review and practice for assessments would be beneficial.',
            'Consider additional test preparation strategies.',
            'Focus on comprehensive review before assessments.'
        ]
    };

    return getRandomElement(phrases[component]);
}

/**
 * Detect simple trend from historical grades
 */
function detectSimpleTrend(historicalGrades: number[], currentGrade: number): 'improving' | 'declining' | 'stable' {
    if (historicalGrades.length === 0) return 'stable';

    const lastGrade = historicalGrades[historicalGrades.length - 1];
    const difference = currentGrade - lastGrade;

    if (difference >= 5) return 'improving';
    if (difference <= -5) return 'declining';
    return 'stable';
}

/**
 * Get phrase based on grade trend
 */
function getTrendPhrase(trend: 'improving' | 'declining' | 'stable', currentGrade: number): string {
    if (trend === 'improving') {
        return 'Keep up the excellent progress!';
    } else if (trend === 'declining') {
        return 'Additional support recommended to reverse declining trend.';
    } else if (currentGrade >= 85) {
        return 'Maintain this consistent performance.';
    }
    return '';
}

/**
 * Get random element from array for variety
 */
function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Remark templates organized by performance level and subject
 */
const REMARK_TEMPLATES: Record<PerformanceLevel, Record<string, string[]>> = {
    outstanding: {
        general: [
            'Outstanding performance!',
            'Exceptional work demonstrated.',
            'Exemplary achievement in this subject.'
        ],
        Math: [
            'Exceptional problem-solving skills demonstrated.',
            'Outstanding analytical thinking in mathematics.',
            'Mastery of mathematical concepts clearly evident.'
        ],
        'General Mathematics': [
            'Exceptional problem-solving skills demonstrated.',
            'Outstanding analytical thinking in mathematics.',
            'Mastery of mathematical concepts clearly evident.'
        ],
        'Pre-calculus': [
            'Exceptional mastery of advanced mathematical concepts.',
            'Outstanding analytical and problem-solving abilities.',
            'Demonstrates superior understanding of pre-calculus.'
        ],
        'Basic Calculus': [
            'Exceptional understanding of calculus principles.',
            'Outstanding analytical and computational skills.',
            'Mastery of calculus concepts clearly demonstrated.'
        ],
        'Statistics and Probability': [
            'Exceptional statistical analysis skills.',
            'Outstanding understanding of probability concepts.',
            'Demonstrates superior data interpretation abilities.'
        ],
        English: [
            'Excellent command of language and communication.',
            'Outstanding reading comprehension and writing skills.',
            'Demonstrates superior language proficiency.'
        ],
        'Oral Communication': [
            'Exceptional oral presentation and communication skills.',
            'Outstanding ability to articulate ideas clearly.',
            'Demonstrates superior verbal communication.'
        ],
        'Reading and Writing': [
            'Exceptional literacy and composition skills.',
            'Outstanding comprehension and writing abilities.',
            'Demonstrates superior reading and writing proficiency.'
        ],
        Science: [
            'Exceptional understanding of scientific concepts.',
            'Outstanding application of scientific method.',
            'Demonstrates excellent analytical and inquiry skills.'
        ],
        'Earth Science': [
            'Exceptional understanding of earth science concepts.',
            'Outstanding grasp of geological and atmospheric principles.',
            'Demonstrates superior scientific inquiry skills.'
        ],
        'General Chemistry 1': [
            'Exceptional understanding of chemical principles.',
            'Outstanding laboratory and analytical skills.',
            'Demonstrates superior mastery of chemistry concepts.'
        ],
        Filipino: [
            'Napakahusay na pagkakaunawa sa Filipino.',
            'Natatanging kakayahan sa wika at komunikasyon.',
            'Lubhang mahusay sa paggamit ng wikang Filipino.'
        ],
        'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino': [
            'Napakahusay sa komunikasyon at pananaliksik.',
            'Natatanging kakayahan sa pagsusuri ng kultura.',
            'Lubhang mahusay sa wikang Filipino at pananaliksik.'
        ],
        AP: [
            'Exceptional understanding of social studies concepts.',
            'Outstanding analytical skills in Araling Panlipunan.',
            'Demonstrates superior grasp of Philippine history and culture.'
        ],
        MAPEH: [
            'Outstanding performance across all MAPEH components.',
            'Exceptional skills in music, arts, PE, and health.',
            'Demonstrates superior well-rounded abilities.'
        ],
        TLE: [
            'Exceptional practical and technical skills.',
            'Outstanding hands-on abilities demonstrated.',
            'Demonstrates superior vocational competencies.'
        ],
        'Empowerment Technology': [
            'Exceptional digital literacy and technical skills.',
            'Outstanding understanding of technology concepts.',
            'Demonstrates superior ICT competencies.'
        ]
    },
    very_satisfactory: {
        general: [
            'Very satisfactory work.',
            'Commendable performance demonstrated.',
            'Strong understanding shown.'
        ],
        Math: [
            'Shows strong grasp of mathematical fundamentals.',
            'Demonstrates solid understanding and good effort.',
            'Performing well above average in mathematics.'
        ],
        English: [
            'Strong language skills demonstrated.',
            'Good comprehension and communication abilities.',
            'Solid performance in English.'
        ],
        Science: [
            'Strong understanding of scientific concepts.',
            'Good application of scientific principles.',
            'Solid performance in science.'
        ],
        Filipino: [
            'Mahusay na pagkakaunawa sa Filipino.',
            'Mabuting kakayahan sa wika at komunikasyon.',
            'Mataas na antas ng pagganap sa Filipino.'
        ],
        AP: [
            'Strong understanding of social studies.',
            'Good analytical skills in Araling Panlipunan.',
            'Solid grasp of historical and cultural concepts.'
        ],
        MAPEH: [
            'Strong performance in MAPEH components.',
            'Good skills across music, arts, PE, and health.',
            'Well-rounded abilities demonstrated.'
        ],
        TLE: [
            'Strong practical skills shown.',
            'Good hands-on abilities.',
            'Solid vocational competencies.'
        ]
    },
    satisfactory: {
        general: [
            'Satisfactory performance.',
            'Meets expected standards.',
            'Adequate understanding demonstrated.'
        ],
        Math: [
            'Satisfactory grasp of mathematical concepts.',
            'Meets basic requirements in mathematics.',
            'Adequate performance with room for growth.'
        ],
        English: [
            'Satisfactory language skills.',
            'Meets basic communication standards.',
            'Adequate performance in English.'
        ],
        Science: [
            'Satisfactory understanding of science.',
            'Meets basic scientific literacy requirements.',
            'Adequate performance with potential for improvement.'
        ],
        Filipino: [
            'Kasiya-siyang pagkakaunawa sa Filipino.',
            'Umaabot sa inaasahang antas.',
            'Sapat na pagganap sa Filipino.'
        ],
        AP: [
            'Satisfactory understanding of social studies.',
            'Meets basic requirements in Araling Panlipunan.',
            'Adequate grasp of concepts.'
        ],
        MAPEH: [
            'Satisfactory performance in MAPEH.',
            'Meets basic requirements.',
            'Adequate skills demonstrated.'
        ],
        TLE: [
            'Satisfactory practical skills.',
            'Meets basic technical requirements.',
            'Adequate vocational competencies.'
        ]
    },
    fairly_satisfactory: {
        general: [
            'Fairly satisfactory work.',
            'Approaching expected standards.',
            'Shows potential with additional effort.'
        ],
        Math: [
            'Fairly satisfactory understanding of math.',
            'Additional practice would strengthen skills.',
            'Shows potential with more focused effort.'
        ],
        English: [
            'Fairly satisfactory language skills.',
            'Additional reading and writing practice recommended.',
            'Shows potential for improvement.'
        ],
        Science: [
            'Fairly satisfactory understanding of science.',
            'Additional study would strengthen concepts.',
            'Shows potential with more effort.'
        ],
        Filipino: [
            'Medyo kasiya-siyang pagkakaunawa.',
            'Kailangan ng karagdagang pagsasanay.',
            'May potensyal na umunlad.'
        ],
        AP: [
            'Fairly satisfactory understanding.',
            'Additional study recommended.',
            'Shows potential for improvement.'
        ],
        MAPEH: [
            'Fairly satisfactory performance.',
            'Additional practice would help.',
            'Shows potential with more effort.'
        ],
        TLE: [
            'Fairly satisfactory practical skills.',
            'Additional hands-on practice recommended.',
            'Shows potential for improvement.'
        ]
    },
    needs_improvement: {
        general: [
            'Needs improvement.',
            'Additional support strongly recommended.',
            'Requires focused intervention.'
        ],
        Math: [
            'Needs significant improvement in mathematics.',
            'Immediate tutoring support recommended.',
            'Requires focused intervention and practice.'
        ],
        English: [
            'Needs improvement in language skills.',
            'Additional reading and writing support needed.',
            'Requires focused intervention.'
        ],
        Science: [
            'Needs improvement in scientific understanding.',
            'Additional support and study time required.',
            'Requires focused intervention.'
        ],
        Filipino: [
            'Nangangailangan ng pagpapabuti.',
            'Kailangan ng karagdagang tulong.',
            'Nangangailangan ng pokus na interbensyon.'
        ],
        AP: [
            'Needs improvement in social studies.',
            'Additional support recommended.',
            'Requires focused study and intervention.'
        ],
        MAPEH: [
            'Needs improvement across MAPEH components.',
            'Additional practice and support needed.',
            'Requires focused intervention.'
        ],
        TLE: [
            'Needs improvement in practical skills.',
            'Additional hands-on practice required.',
            'Requires focused intervention and support.'
        ]
    }
};
