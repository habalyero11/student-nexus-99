import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Brain, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { StudentData } from "@/lib/analytics";

interface Assignment {
    year_level: string;
    section: string;
    strand?: string;
}

interface PredictiveAnalyticsCardProps {
    userRole: string;
    advisorAssignments?: Assignment[];
}

interface PredictionItem {
    studentId: string;
    studentName: string;
    yearLevel: string;
    section: string;
    averageGrade: number;
    riskLevel: 'high' | 'medium' | 'low';
    prediction: string;
    suggestions: string[];
    factors: any[];
    failingSubjects?: { subject: string; grade: number }[];
}

interface CachedPredictions {
    predictions: PredictionItem[];
    timestamp: number;
    userRole: string;
    advisorAssignments: string;
}

const CACHE_KEY = 'gemini-predictions-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const REFRESH_BUTTON_THRESHOLD = 0; // Always allow refresh

export const PredictiveAnalyticsCard = ({ userRole, advisorAssignments = [] }: PredictiveAnalyticsCardProps) => {
    const [predictions, setPredictions] = useState<PredictionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cacheAge, setCacheAge] = useState<number | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        fetchPredictions();
    }, [userRole, advisorAssignments]);

    // Cache management functions
    const loadFromCache = (): CachedPredictions | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const parsed: CachedPredictions = JSON.parse(cached);

            // Validate cache matches current user context
            const assignmentsKey = JSON.stringify(advisorAssignments);
            if (parsed.userRole !== userRole || parsed.advisorAssignments !== assignmentsKey) {
                // Cache is for different user/role, invalidate it
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            // Check if cache is still valid (within 24 hours)
            const age = Date.now() - parsed.timestamp;
            if (age > CACHE_DURATION) {
                // Cache expired
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return parsed;
        } catch (error) {
            console.error('Error loading cache:', error);
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
    };

    const saveToCache = (predictions: PredictionItem[]) => {
        try {
            const cacheData: CachedPredictions = {
                predictions,
                timestamp: Date.now(),
                userRole,
                advisorAssignments: JSON.stringify(advisorAssignments),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchPredictions(true);
    };

    const formatCacheAge = (ageMs: number): string => {
        const hours = Math.floor(ageMs / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return 'just now';
        }
    };

    const fetchPredictions = async (forceRefresh: boolean = false) => {
        try {
            setLoading(true);
            setError(null);

            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = loadFromCache();
                if (cached) {
                    setPredictions(cached.predictions);
                    setCacheAge(Date.now() - cached.timestamp);
                    setLoading(false);
                    return;
                }
            }

            // Fetch students based on role
            let studentsQuery = supabase.from("students").select("*");

            // For advisors, filter by their assignments
            if (userRole === "advisor" && advisorAssignments.length > 0) {
                // Build OR conditions for each assignment
                const conditions = advisorAssignments.map(a => {
                    if (a.strand) {
                        return `and(year_level.eq.${a.year_level},section.eq.${a.section},strand.eq.${a.strand})`;
                    }
                    return `and(year_level.eq.${a.year_level},section.eq.${a.section})`;
                });
                studentsQuery = studentsQuery.or(conditions.join(','));
            }

            const { data: students, error: studentsError } = await studentsQuery;

            if (studentsError) throw studentsError;
            if (!students || students.length === 0) {
                setPredictions([]);
                saveToCache([]);
                setCacheAge(0);
                setLoading(false);
                return;
            }

            // Fetch grades for these students
            const studentIds = students.map(s => s.id);
            const { data: grades } = await supabase
                .from("grades")
                .select("*")
                .in("student_id", studentIds);

            // Fetch attendance for these students
            const { data: attendance } = await supabase
                .from("attendance")
                .select("*")
                .in("student_id", studentIds);

            // Prepare student data for analytics
            const studentData: StudentData[] = students.map(student => {
                const studentGrades = grades?.filter(g => g.student_id === student.id) || [];
                const studentAttendance = attendance?.filter(a => a.student_id === student.id) || [];

                // Calculate average grade
                const gradeValues = studentGrades
                    .map(g => g.final_grade)
                    .filter((g): g is number => g !== null);
                const averageGrade = gradeValues.length > 0
                    ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
                    : 75; // Default if no grades

                // Calculate attendance rate
                const presentCount = studentAttendance.filter(a =>
                    a.status?.toLowerCase() === 'present'
                ).length;
                const attendanceRate = studentAttendance.length > 0
                    ? (presentCount / studentAttendance.length) * 100
                    : 100; // Default if no records

                // Determine trend (simplified - compare first half to second half of grades)
                let trend: 'improving' | 'declining' | 'stable' = 'stable';
                if (gradeValues.length >= 4) {
                    const halfIndex = Math.floor(gradeValues.length / 2);
                    const firstHalf = gradeValues.slice(0, halfIndex);
                    const secondHalf = gradeValues.slice(halfIndex);
                    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                    if (secondAvg > firstAvg + 2) trend = 'improving';
                    else if (secondAvg < firstAvg - 2) trend = 'declining';
                }

                return {
                    id: student.id,
                    name: `${student.first_name} ${student.last_name}`,
                    yearLevel: student.year_level,
                    section: student.section,
                    strand: student.strand || undefined,
                    averageGrade,
                    attendanceRate,
                    trend,
                    grades: studentGrades.map(g => ({
                        subject: g.subject,
                        quarter: g.quarter,
                        finalGrade: g.final_grade || 0,
                        writtenWork: g.written_work,
                        performanceTask: g.performance_task,
                        quarterlyAssessment: g.quarterly_assessment
                    })),
                };
            });

            // Filter students who might need attention (below 85% avg, declining, or low attendance)
            const studentsNeedingAttention = studentData.filter(s =>
                s.averageGrade < 85 || s.trend === 'declining' || s.attendanceRate < 85
            );

            if (studentsNeedingAttention.length === 0) {
                setPredictions([]);
                saveToCache([]);
                setCacheAge(0);
                setLoading(false);
                return;
            }

            // Use rule-based analytics instead of Gemini API
            const { calculateRiskScore } = await import('@/lib/analytics');

            const rulePredictions = studentsNeedingAttention
                .map(student => {
                    const assessment = calculateRiskScore(student);
                    return {
                        studentId: student.id,
                        studentName: student.name,
                        yearLevel: student.yearLevel,
                        section: student.section,
                        averageGrade: student.averageGrade,
                        riskLevel: assessment.level,
                        prediction: assessment.summary,
                        suggestions: assessment.recommendations,
                        factors: assessment.factors,
                        failingSubjects: assessment.failingSubjects,
                        // Helper for sorting
                        riskScore: assessment.score
                    };
                })
                .filter(p => p.riskLevel === 'high' || p.riskLevel === 'medium')
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 20);

            setPredictions(rulePredictions);
            saveToCache(rulePredictions);
            setCacheAge(0);

            if (forceRefresh) {
                toast({
                    title: "Predictions Refreshed",
                    description: "AI predictions have been updated with the latest data.",
                });
            }
        } catch (err: any) {
            console.error("Error fetching predictions:", err);
            setError("Failed to load AI predictions");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    if (loading && predictions.length === 0) {
        return (
            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="h-5 w-5 text-purple-500" />
                        AI Predictive Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse flex items-center gap-2">
                            <div className="h-4 w-4 bg-purple-200 rounded-full animate-bounce" />
                            <span className="text-muted-foreground">Analyzing student data with AI...</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="h-5 w-5 text-purple-500" />
                        AI Predictive Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-soft border-l-4 border-l-purple-500">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Brain className="h-5 w-5 text-purple-500" />
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            AI Predictive Analytics
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {userRole === "admin"
                                ? "AI-powered insights for all students across the system"
                                : "AI-powered insights for students in your assigned sections"}
                        </p>
                        {cacheAge !== null && cacheAge > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Last updated: {formatCacheAge(cacheAge)}
                            </p>
                        )}
                    </div>
                    {/* Show refresh button only if data is 3+ days old */}
                    {cacheAge !== null && cacheAge >= REFRESH_BUTTON_THRESHOLD && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {predictions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-12 w-12 mx-auto mb-2 text-yellow-400 opacity-50" />
                        <p>No students currently identified as At-Risk (High or Medium).</p>
                        <p className="text-sm">Great job! All students are maintaining safely passing grades.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {predictions.slice(0, expanded ? undefined : 3).map((prediction) => (
                            <div
                                key={prediction.studentId}
                                className="bg-muted/50 p-4 rounded-lg border border-border hover:border-purple-200 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                                            {prediction.studentName}
                                            <Badge variant={
                                                prediction.riskLevel === 'high' ? 'destructive' : 'default'
                                            } className={
                                                prediction.riskLevel === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
                                            }>
                                                {prediction.riskLevel.toUpperCase()} RISK
                                            </Badge>
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {prediction.yearLevel} - {prediction.section} • Avg: {prediction.averageGrade.toFixed(1)}%
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/students?student=${prediction.studentId}`)}
                                    >
                                        View Profile
                                    </Button>
                                </div>

                                {/* Failing Subjects Display - Prominent */}
                                {prediction.failingSubjects && prediction.failingSubjects.length > 0 && (
                                    <div className="bg-red-50 p-3 rounded-md border border-red-100 mb-3">
                                        <div className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Failing Subjects
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {prediction.failingSubjects.map((sub, idx) => (
                                                <Badge key={idx} variant="outline" className="bg-white border-red-200 text-red-700 font-medium">
                                                    {sub.subject}: {sub.grade}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-sm text-foreground/80 mb-3 font-medium">
                                    {prediction.prediction}
                                </p>

                                <div className="bg-background p-3 rounded-md text-sm border border-border/50">
                                    <p className="font-medium mb-2 flex items-center gap-1 text-purple-600">
                                        <Sparkles className="h-3 w-3" /> Recommended Actions:
                                    </p>
                                    <ul className="space-y-1">
                                        {prediction.suggestions.map((suggestion, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                                <span>{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}

                        {predictions.length > 3 && (
                            <Button
                                variant="ghost"
                                className="w-full text-muted-foreground hover:text-foreground"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <><ChevronUp className="h-4 w-4 mr-2" /> Show Less</>
                                ) : (
                                    <><ChevronDown className="h-4 w-4 mr-2" /> Show {predictions.length - 3} More Students</>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
