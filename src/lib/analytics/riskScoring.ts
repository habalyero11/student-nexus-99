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
    // Pass failingSubjects + student id so recommendations are unique per student
    const recommendations = generateRecommendations(factors, avgGrade, attendance, failingSubjects, student.id);

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
 * Pools of subject-specific intervention sentences. Each pool has 20+ options.
 * A deterministic hash of (studentId + subject + grade) picks one so the same
 * student always sees the same suggestion for a subject, but different students
 * (and different subjects within the same student) get distinct sentences.
 */
const INTERVENTION_POOLS: { match: RegExp; key: string; sentences: string[] }[] = [
    {
        key: 'math',
        match: /(math|algebra|geometry|calculus|statistic|trigonometr|number)/,
        sentences: [
            'drill problem-solving and review key formulas',
            'assign 10-item daily problem sets focused on weak topics',
            'pair with a peer tutor for guided practice twice a week',
            'use step-by-step worked examples before independent practice',
            'review prerequisite skills (fractions, signed numbers, equations)',
            'integrate manipulatives and visual models for abstract concepts',
            'schedule one-on-one consultation to identify misconceptions',
            'use Khan Academy or DepEd LRMDS modules for remediation',
            'do timed drills on basic computation to rebuild fluency',
            'reteach the most-missed quarterly assessment items',
            'introduce concept-mapping for word-problem decomposition',
            'practice graphing and interpretation with real-world data',
            'assign reflective error-analysis on past quizzes',
            'break complex problems into smaller checkpoint exercises',
            'use board-work demonstrations to build confidence',
            'require a math journal with daily problem reflections',
            'practice mental-math routines at the start of each class',
            'group similar problems by strategy and rotate practice',
            'have the student verbalize each solution step aloud',
            'set short mastery quizzes after every reteaching session',
            'differentiate homework by difficulty tier with scaffolds',
        ],
    },
    {
        key: 'science',
        match: /(science|biology|chemistry|physics|earth)/,
        sentences: [
            'reinforce core concepts with lab/practice exercises',
            'use diagrams and concept maps to clarify processes',
            'assign short investigatory write-ups on weak topics',
            'reteach using guided inquiry and predict-observe-explain tasks',
            'practice unit conversions and scientific notation drills',
            'pair lecture review with hands-on lab demonstrations',
            'use video simulations (PhET, Khan Academy) before quizzes',
            'require a science journal of vocabulary and definitions',
            'reteach using analogies tied to everyday phenomena',
            'assign focused practice on free-body or cell diagrams',
            'review safety procedures and lab measurement skills',
            'do small-group concept-checking before full assessments',
            'use flashcards for terminology and processes',
            'integrate question-of-the-day rooted in past lessons',
            'have the student summarize each lesson in their own words',
            'reteach the most-missed quarterly assessment items',
            'do error analysis on lab reports and data tables',
            'pair with a peer tutor for problem-solving sessions',
            'assign chunked readings with comprehension questions',
            'require labeled drawings for each new concept',
            'use mnemonic devices for taxonomy and classification',
            'reinforce graph-reading and data-interpretation skills',
        ],
    },
    {
        key: 'english',
        match: /(english|reading|literature|language\s*arts)/,
        sentences: [
            'assign guided reading and writing practice',
            'do daily 15-minute silent reading with a reflection prompt',
            'practice sentence construction and paragraph development drills',
            'use graphic organizers for reading comprehension',
            'reteach grammar rules using authentic text examples',
            'assign short writing tasks with structured peer feedback',
            'practice vocabulary in context with weekly word lists',
            'use leveled readers to build fluency and confidence',
            'require a reading log with summary and reaction',
            'reteach the most-missed quarterly assessment items',
            'do think-aloud modeling for inferencing and main idea',
            'pair with a reading buddy for paired-reading sessions',
            'assign focused practice on subject-verb agreement',
            'use sentence-combining exercises to improve syntax',
            'practice answering HOTS questions in complete sentences',
            'use audiobooks alongside text for struggling decoders',
            'reteach essay structure with sentence-frame scaffolds',
            'practice transitions and cohesive devices in writing',
            'do dictation drills for spelling and punctuation',
            'use short stories for close-reading micro-lessons',
            'require a weekly journal entry with grammar focus',
        ],
    },
    {
        key: 'filipino',
        match: /(filipino|tagalog|mtb|mother tongue|wika)/,
        sentences: [
            'practice grammar and reading comprehension',
            'magtalaga ng pang-araw-araw na pagsasanay sa pagbabasa',
            'gamitin ang dula-dulaan para sa paunawa sa wika',
            'magbigay ng maikling pagsulat tungkol sa pang-araw-araw na karanasan',
            'reteach pagbabantas at panghalip gamit ang mga totoong teksto',
            'use graphic organizers para sa pag-unawa sa kuwento',
            'gawing pang-araw-araw ang bokabularyo at pagsasalita',
            'mag-assign ng tula o sanaysay na may peer feedback',
            'pair with a peer tutor para sa pagsasanay sa pagsasalita',
            'reteach the most-missed quarterly assessment items',
            'magpa-summarize ng mga akdang nabasa sa sariling salita',
            'gamitin ang leveled readers ayon sa antas ng mag-aaral',
            'magpasagot ng HOTS questions sa Filipino tuwing aralin',
            'magpasanay ng panghalip, pang-uri at pang-abay sa konteksto',
            'gawing rutina ang dictation para sa baybay at bantas',
            'use mnemonic at jingles para sa balarila',
            'reteach using authentic Filipino media (balita, awit, tula)',
            'magpasagot ng comprehension log kada akdang binasa',
            'mag-assign ng oral recitation gamit ang sariling salita',
            'pagsasanayan ang pagbasa nang malakas para sa fluency',
            'gumamit ng word wall para sa bagong bokabularyo',
        ],
    },
    {
        key: 'ap',
        match: /(araling|ap\b|social|history|civic|economics|panlipunan)/,
        sentences: [
            'use concept maps and review key events/terms',
            'create timelines for historical periods being assessed',
            'assign source-analysis tasks on primary documents',
            'reteach using maps, charts, and infographics',
            'pair lectures with short documentary clips for context',
            'require a current-events journal tied to lesson themes',
            'practice cause-and-effect analysis with graphic organizers',
            'use compare-and-contrast charts for societies/eras',
            'reteach the most-missed quarterly assessment items',
            'assign role-play or simulation of historical decisions',
            'use flashcards for dates, places, and key personalities',
            'do short essay prompts focused on argument and evidence',
            'group-discuss case studies to build civic reasoning',
            'use a vocabulary list of social science terminology',
            'pair with a peer tutor for review of weak units',
            'practice reading and interpreting data tables/graphs',
            'use mnemonic devices for sequences of events',
            'assign reflection essays on lessons of the past',
            'integrate local history to anchor abstract concepts',
            'require a one-page summary after every chapter',
            'do mock debates on historical or civic dilemmas',
        ],
    },
    {
        key: 'mapeh',
        match: /(mapeh|music|arts|p\.?e\.?|health|physical|sining|musika)/,
        sentences: [
            'focus on missed performance tasks and rubrics',
            'review rubric criteria before each performance task',
            'allow re-submission of performance outputs with feedback',
            'pair students for collaborative practice sessions',
            'demonstrate exemplars before independent performance',
            'reteach key concepts with short audio/visual clips',
            'integrate health journaling for the Health component',
            'practice basic skills daily before complex routines',
            'video-record practice runs for self-assessment',
            'use checklists for each criterion in the rubric',
            'reteach the most-missed quarterly assessment items',
            'introduce mini-performances to build confidence',
            'pair with a peer mentor strong in the strand',
            'reinforce vocabulary specific to music/arts/PE/health',
            'assign reflection logs after each performance task',
            'break performance tasks into smaller weekly checkpoints',
            'use guided rehearsals with teacher feedback',
            'integrate cross-strand projects (e.g., music + health)',
            'use formative quizzes on theoretical components',
            'celebrate small wins to sustain engagement',
            'allow choice in performance medium when appropriate',
        ],
    },
    {
        key: 'tle',
        match: /(tle|tve|epp|livelihood|technology|computer|ict|ictl)/,
        sentences: [
            'complete hands-on activities and skill demos',
            'reteach safety and tool-handling procedures first',
            'break performance tasks into weekly skill checkpoints',
            'pair students for buddy-work on practical skills',
            'demonstrate exemplar outputs before independent work',
            'use rubrics with student self-assessment after each task',
            'allow re-submission of practical outputs with feedback',
            'integrate short reflection logs after every activity',
            'reteach the most-missed quarterly assessment items',
            'reinforce technical vocabulary with picture flashcards',
            'use video tutorials before in-class demos',
            'assign mini-projects that build toward a major output',
            'have students keep a tools-and-materials journal',
            'pair with a peer tutor strong in the specialization',
            'practice measurement and accuracy drills',
            'integrate digital literacy mini-tasks for ICT learners',
            'simulate real workplace scenarios for context',
            'use checklists for each step of a procedure',
            'allow choice in product output to boost engagement',
            'do dry-runs before any graded practical exam',
            'reteach the entrepreneurship/work-readiness fundamentals',
        ],
    },
    {
        key: 'esp',
        match: /(esp\b|values|edukasyon|gmrc|good\s*manners)/,
        sentences: [
            'engage with reflection and case-study tasks',
            'assign weekly value-of-the-week journal entries',
            'use real-life dilemmas for guided class discussion',
            'pair students for paired reflection on lesson themes',
            'use role-play to practice positive behaviors',
            'reteach using stories with clear moral conflicts',
            'integrate community-service mini-projects',
            'have students set and review personal goals weekly',
            'use rubrics that reward depth of reflection',
            'reteach the most-missed quarterly assessment items',
            'assign reaction papers on selected stories or videos',
            'practice respectful discourse in structured debates',
            'connect lessons to family and school experiences',
            'use exemplars of strong reflection writing',
            'integrate a kindness/gratitude log for two weeks',
            'pair with a peer mentor to model good behavior',
            'use small-group sharing circles for sensitive topics',
            'reinforce key vocabulary on values and virtues',
            'assign short essays applying values to current events',
            'use case studies drawn from local community life',
            'celebrate concrete examples of student virtue in class',
        ],
    },
    {
        key: 'research',
        match: /(research|capstone|practical|investigatory|thesis)/,
        sentences: [
            'set milestone check-ins on the project',
            'require a weekly progress log with adviser sign-off',
            'reteach citation and reference formatting',
            'break the paper into chapter-by-chapter checkpoints',
            'pair with a peer for accountability and review',
            'reteach research-question formulation',
            'practice paraphrasing to avoid plagiarism issues',
            'require an outline approval before drafting',
            'reteach data-collection and survey instrument design',
            'use a rubric walk-through before each submission',
            'assign short literature-review summaries weekly',
            'practice basic statistics for data analysis',
            'use exemplar papers to model expected quality',
            'reteach the most-missed quarterly assessment items',
            'require regular adviser conferences to unblock progress',
            'practice writing introductions and problem statements',
            'reteach APA/IEEE citation style with worked examples',
            'integrate peer-review sessions before final draft',
            'set small daily writing targets (250–300 words)',
            'reteach how to interpret tables and figures',
            'require a defense rehearsal before final presentation',
        ],
    },
];

const FALLBACK_INTERVENTIONS = [
    'target weak topics with focused practice',
    'reteach the most-missed quarterly assessment items',
    'pair with a peer tutor for guided practice sessions',
    'assign short daily review tasks on weak areas',
    'use formative quizzes to monitor weekly progress',
    'schedule one-on-one consultation to identify gaps',
    'break large tasks into smaller weekly checkpoints',
    'use rubrics and exemplars to clarify expectations',
    'reinforce subject vocabulary with daily flashcards',
    'integrate worked examples before independent practice',
    'use graphic organizers to structure new content',
    'allow re-submission of low-scoring outputs with feedback',
    'practice the most-missed item types from past quizzes',
    'assign reflective error analysis on prior assessments',
    'use video tutorials to pre-teach upcoming lessons',
    'set short mastery quizzes after every reteach',
    'pair lecture with practice immediately after',
    'use spaced retrieval practice over the week',
    'reteach using real-world contexts for relevance',
    'celebrate small wins to sustain motivation',
    'monitor study habits and adjust interventions weekly',
];

/**
 * Stable 32-bit FNV-1a hash for deterministic selection.
 */
function hashString(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
}

/**
 * Subject-specific intervention. Picks one of ~20 sentences for the matched
 * subject family using a deterministic hash of (studentId + subject + grade)
 * so each student/subject combination stays consistent but varies between
 * students.
 */
function getSubjectIntervention(subject: string, studentId: string, grade: number): string {
    const s = subject.toLowerCase();
    const pool = INTERVENTION_POOLS.find(p => p.match.test(s));
    const sentences = pool ? pool.sentences : FALLBACK_INTERVENTIONS;
    const seed = `${studentId}|${pool?.key ?? 'fallback'}|${subject}|${grade}`;
    const idx = hashString(seed) % sentences.length;
    return sentences[idx];
}

/**
 * Generate concise, subject-aware recommendations.
 * - One line per failing subject (most actionable, unique)
 * - Add at most one attendance line if attendance is a real factor
 * - Add one trend line only if declining and we still have room
 */
function generateRecommendations(
    factors: RiskFactor[],
    avgGrade: number,
    attendance: number,
    failingSubjects: { subject: string; grade: number }[] = [],
    studentId: string = ''
): string[] {
    const recommendations: string[] = [];

    // 1. Subject-specific (priority): one concise line per failing subject
    const sorted = [...failingSubjects].sort((a, b) => a.grade - b.grade);
    for (const f of sorted) {
        const action = getSubjectIntervention(f.subject, studentId, f.grade);
        recommendations.push(`${f.subject} (${f.grade}): ${action}`);
    }

    // 2. Attendance (only if meaningfully low)
    const attendanceFactor = factors.find(f => f.type === 'attendance');
    if (attendanceFactor) {
        if (attendanceFactor.severity === 'high') {
            recommendations.push(`Address chronic absenteeism (${attendance.toFixed(0)}%)`);
        } else if (attendanceFactor.severity === 'medium') {
            recommendations.push(`Monitor attendance (${attendance.toFixed(0)}%)`);
        }
    }

    // 3. Trend (only if declining and no failing subjects)
    if (failingSubjects.length === 0) {
        const trendFactor = factors.find(f => f.type === 'trend');
        if (trendFactor && trendFactor.severity === 'high') {
            recommendations.push('Schedule weekly progress check-ins');
        }
    }

    // 4. Fallback when no failing subjects but grade is below target
    if (recommendations.length === 0) {
        const gradeFactor = factors.find(f => f.type === 'grade');
        if (gradeFactor) {
            if (gradeFactor.severity === 'high') {
                recommendations.push(`Tutoring needed (avg ${avgGrade.toFixed(0)}%)`);
            } else if (gradeFactor.severity === 'medium') {
                recommendations.push(`Review study habits (avg ${avgGrade.toFixed(0)}%)`);
            } else {
                recommendations.push('On track — keep current pace');
            }
        } else {
            recommendations.push('Maintain current performance');
        }
    }

    return recommendations.slice(0, 4);
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
