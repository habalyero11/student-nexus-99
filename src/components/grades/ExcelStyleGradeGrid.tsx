import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GradeScaleRange {
    min: number;
    max: number;
    label: string;
}

interface GradingSystem {
    id: string;
    name: string;
    written_work_percentage: number;
    performance_task_percentage: number;
    quarterly_assessment_percentage: number;
    grade_scale: GradeScaleRange[];
}

interface Activity {
    score: number | null;
    max: number;
}

interface GradeActivityData {
    id?: string;
    student_id: string;
    subject: string;
    quarter: string;
    component: string;
    activities: Activity[];
    total_score: number;
    highest_possible_score: number;
    percentage_score: number;
    weighted_score: number;
}

interface Student {
    id: string;
    student_id_no: string;
    first_name: string;
    last_name: string;
}

interface ExcelStyleGradeGridProps {
    yearLevel: string;
    section: string;
    subject: string;
    quarter: string;
    gradingSystem: GradingSystem | null;
}

const ExcelStyleGradeGrid = ({
    yearLevel,
    section,
    subject,
    quarter,
    gradingSystem,
}: ExcelStyleGradeGridProps) => {
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [gradeActivities, setGradeActivities] = useState<{ [key: string]: GradeActivityData }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default number of activities per component (can be extended)
    const MAX_WW_ACTIVITIES = 10;
    const MAX_PT_ACTIVITIES = 10;
    const MAX_QA_ACTIVITIES = 3;

    useEffect(() => {
        fetchStudents();
    }, [yearLevel, section]);

    useEffect(() => {
        if (students.length > 0) {
            fetchGradeActivities();
        }
    }, [students, subject, quarter]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("students")
                .select("id, student_id_no, first_name, last_name")
                .eq("year_level", yearLevel)
                .eq("section", section)
                .order("last_name", { ascending: true })
                .order("first_name", { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGradeActivities = async () => {
        try {
            const studentIds = students.map(s => s.id);

            const { data, error } = await supabase
                .from("grade_activities")
                .select("*")
                .in("student_id", studentIds)
                .eq("subject", subject)
                .eq("quarter", quarter);

            if (error) throw error;

            // Organize by student_id and component
            const organized: { [key: string]: GradeActivityData } = {};
            data?.forEach(activity => {
                const key = `${activity.student_id}_${activity.component}`;
                organized[key] = activity;
            });

            setGradeActivities(organized);
        } catch (error) {
            console.error("Error fetching grade activities:", error);
        }
    };

    const getActivityData = (studentId: string, component: string): Activity[] => {
        const key = `${studentId}_${component}`;
        const data = gradeActivities[key];

        if (data && data.activities) {
            return data.activities;
        }

        // Return default empty activities
        const maxActivities = component === "written_work" ? MAX_WW_ACTIVITIES
            : component === "performance_task" ? MAX_PT_ACTIVITIES
                : MAX_QA_ACTIVITIES;

        return Array(maxActivities).fill(null).map(() => ({ score: null, max: 10 }));
    };

    const updateActivity = (studentId: string, component: string, activityIndex: number, field: "score" | "max", value: number | null) => {
        const key = `${studentId}_${component}`;
        const currentData = gradeActivities[key];
        const activities = currentData?.activities || getActivityData(studentId, component);

        const updatedActivities = [...activities];
        updatedActivities[activityIndex] = {
            ...updatedActivities[activityIndex],
            [field]: value,
        };

        // Calculate totals
        const totalScore = updatedActivities.reduce((sum, act) => sum + (act.score || 0), 0);
        const totalHPS = updatedActivities.reduce((sum, act) => sum + (act.max || 0), 0);
        const percentageScore = totalHPS > 0 ? Math.round((totalScore / totalHPS) * 100 * 100) / 100 : 0;

        // Get weight from grading system
        const weight = component === "written_work"
            ? (gradingSystem?.written_work_percentage || 30) / 100
            : component === "performance_task"
                ? (gradingSystem?.performance_task_percentage || 50) / 100
                : (gradingSystem?.quarterly_assessment_percentage || 20) / 100;

        const weightedScore = Math.round(percentageScore * weight * 100) / 100;

        setGradeActivities(prev => ({
            ...prev,
            [key]: {
                ...currentData,
                student_id: studentId,
                subject,
                quarter,
                component,
                activities: updatedActivities,
                total_score: totalScore,
                highest_possible_score: totalHPS,
                percentage_score: percentageScore,
                weighted_score: weightedScore,
            },
        }));
    };

    const saveGrades = async () => {
        try {
            setSaving(true);

            const dataToSave = Object.values(gradeActivities).map(data => ({
                student_id: data.student_id,
                subject: data.subject,
                quarter: data.quarter,
                component: data.component,
                activities: data.activities,
                total_score: data.total_score,
                highest_possible_score: data.highest_possible_score,
                percentage_score: data.percentage_score,
                weighted_score: data.weighted_score,
            }));

            // Upsert grade activities
            const { error } = await supabase
                .from("grade_activities")
                .upsert(dataToSave, {
                    onConflict: "student_id,subject,quarter,component",
                });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Grades saved successfully",
            });

            // Recalculate and update final grades in grades table
            await updateFinalGrades();
        } catch (error: any) {
            console.error("Error saving grades:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save grades",
            });
        } finally {
            setSaving(false);
        }
    };

    const updateFinalGrades = async () => {
        // Calculate final grades for each student
        const finalGrades = students.map(student => {
            const wwKey = `${student.id}_written_work`;
            const ptKey = `${student.id}_performance_task`;
            const qaKey = `${student.id}_quarterly_assessment`;

            const wwWS = gradeActivities[wwKey]?.weighted_score || 0;
            const ptWS = gradeActivities[ptKey]?.weighted_score || 0;
            const qaWS = gradeActivities[qaKey]?.weighted_score || 0;

            const finalGrade = Math.round(wwWS + ptWS + qaWS);

            // Get grade remark using grading system scale
            let remarks = "Not Graded";
            if (gradingSystem && gradingSystem.grade_scale) {
                for (const range of gradingSystem.grade_scale) {
                    if (finalGrade >= range.min && finalGrade <= range.max) {
                        remarks = range.label;
                        break;
                    }
                }
            }

            return {
                student_id: student.id,
                subject,
                quarter,
                written_work: gradeActivities[wwKey]?.percentage_score || null,
                performance_task: gradeActivities[ptKey]?.percentage_score || null,
                quarterly_assessment: gradeActivities[qaKey]?.percentage_score || null,
                final_grade: finalGrade,
                remarks,
            };
        });

        // Upsert to grades table
        await supabase.from("grades").upsert(finalGrades, {
            onConflict: "student_id,subject,quarter",
        });
    };

    const calculateFinalGrade = (studentId: string): number => {
        const wwKey = `${studentId}_written_work`;
        const ptKey = `${studentId}_performance_task`;
        const qaKey = `${studentId}_quarterly_assessment`;

        const wwWS = gradeActivities[wwKey]?.weighted_score || 0;
        const ptWS = gradeActivities[ptKey]?.weighted_score || 0;
        const qaWS = gradeActivities[qaKey]?.weighted_score || 0;

        return Math.round(wwWS + ptWS + qaWS);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Loading students...</p>
                </CardContent>
            </Card>
        );
    }

    if (students.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No students found in this section</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Metadata Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-2xl">
                        Grade Sheet - {quarter.toUpperCase()} Quarter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold">Grade & Section:</span>
                            <span className="ml-2">{yearLevel}-{section}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Subject:</span>
                            <span className="ml-2">{subject}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={saveGrades} disabled={saving} className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save All Grades"}</span>
                </Button>
            </div>

            {/* Excel-Style Grid */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {/* Main Headers */}
                                <TableRow>
                                    <TableHead rowSpan={2} className="border text-center">#</TableHead>
                                    <TableHead rowSpan={2} className="border text-center min-w-[200px]">
                                        LEARNERS' NAMES
                                    </TableHead>
                                    <TableHead colSpan={MAX_WW_ACTIVITIES + 3} className="border text-center bg-blue-50">
                                        WRITTEN WORKS ({gradingSystem?.written_work_percentage || 30}%)
                                    </TableHead>
                                    <TableHead colSpan={MAX_PT_ACTIVITIES + 3} className="border text-center bg-green-50">
                                        PERFORMANCE TASKS ({gradingSystem?.performance_task_percentage || 50}%)
                                    </TableHead>
                                    <TableHead colSpan={MAX_QA_ACTIVITIES + 3} className="border text-center bg-orange-50">
                                        QUARTERLY ASSESSMENT ({gradingSystem?.quarterly_assessment_percentage || 20}%)
                                    </TableHead>
                                    <TableHead rowSpan={2} className="border text-center bg-purple-50">
                                        FINAL GRADE
                                    </TableHead>
                                </TableRow>

                                {/* Sub Headers */}
                                <TableRow>
                                    {/* WW Activity Numbers */}
                                    {Array.from({ length: MAX_WW_ACTIVITIES }, (_, i) => (
                                        <TableHead key={`ww-${i}`} className="border text-center text-xs bg-blue-50">
                                            {i + 1}
                                        </TableHead>
                                    ))}
                                    <TableHead className="border text-center text-xs bg-blue-100">Total</TableHead>
                                    <TableHead className="border text-center text-xs bg-blue-100">PS</TableHead>
                                    <TableHead className="border text-center text-xs bg-blue-100">WS</TableHead>

                                    {/* PT Activity Numbers */}
                                    {Array.from({ length: MAX_PT_ACTIVITIES }, (_, i) => (
                                        <TableHead key={`pt-${i}`} className="border text-center text-xs bg-green-50">
                                            {i + 1}
                                        </TableHead>
                                    ))}
                                    <TableHead className="border text-center text-xs bg-green-100">Total</TableHead>
                                    <TableHead className="border text-center text-xs bg-green-100">PS</TableHead>
                                    <TableHead className="border text-center text-xs bg-green-100">WS</TableHead>

                                    {/* QA Activity Numbers */}
                                    {Array.from({ length: MAX_QA_ACTIVITIES }, (_, i) => (
                                        <TableHead key={`qa-${i}`} className="border text-center text-xs bg-orange-50">
                                            {i + 1}
                                        </TableHead>
                                    ))}
                                    <TableHead className="border text-center text-xs bg-orange-100">Total</TableHead>
                                    <TableHead className="border text-center text-xs bg-orange-100">PS</TableHead>
                                    <TableHead className="border text-center text-xs bg-orange-100">WS</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {/* Student Rows */}
                                {students.map((student, idx) => {
                                    const wwActivities = getActivityData(student.id, "written_work");
                                    const ptActivities = getActivityData(student.id, "performance_task");
                                    const qaActivities = getActivityData(student.id, "quarterly_assessment");

                                    const wwKey = `${student.id}_written_work`;
                                    const ptKey = `${student.id}_performance_task`;
                                    const qaKey = `${student.id}_quarterly_assessment`;

                                    const wwData = gradeActivities[wwKey];
                                    const ptData = gradeActivities[ptKey];
                                    const qaData = gradeActivities[qaKey];

                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell className="border text-center">{idx + 1}</TableCell>
                                            <TableCell className="border">
                                                {student.last_name}, {student.first_name}
                                            </TableCell>

                                            {/* WW Activities */}
                                            {wwActivities.map((activity, actIdx) => (
                                                <TableCell key={`ww-${actIdx}`} className="border p-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={activity.max}
                                                        value={activity.score ?? ""}
                                                        onChange={(e) =>
                                                            updateActivity(
                                                                student.id,
                                                                "written_work",
                                                                actIdx,
                                                                "score",
                                                                e.target.value ? parseFloat(e.target.value) : null
                                                            )
                                                        }
                                                        className="w-16 h-8 text-center text-xs"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="border text-center text-sm bg-blue-50">
                                                {wwData?.total_score?.toFixed(0) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-blue-50">
                                                {wwData?.percentage_score?.toFixed(2) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-blue-50">
                                                {wwData?.weighted_score?.toFixed(2) || 0}
                                            </TableCell>

                                            {/* PT Activities */}
                                            {ptActivities.map((activity, actIdx) => (
                                                <TableCell key={`pt-${actIdx}`} className="border p-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={activity.max}
                                                        value={activity.score ?? ""}
                                                        onChange={(e) =>
                                                            updateActivity(
                                                                student.id,
                                                                "performance_task",
                                                                actIdx,
                                                                "score",
                                                                e.target.value ? parseFloat(e.target.value) : null
                                                            )
                                                        }
                                                        className="w-16 h-8 text-center text-xs"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="border text-center text-sm bg-green-50">
                                                {ptData?.total_score?.toFixed(0) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-green-50">
                                                {ptData?.percentage_score?.toFixed(2) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-green-50">
                                                {ptData?.weighted_score?.toFixed(2) || 0}
                                            </TableCell>

                                            {/* QA Activities */}
                                            {qaActivities.map((activity, actIdx) => (
                                                <TableCell key={`qa-${actIdx}`} className="border p-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={activity.max}
                                                        value={activity.score ?? ""}
                                                        onChange={(e) =>
                                                            updateActivity(
                                                                student.id,
                                                                "quarterly_assessment",
                                                                actIdx,
                                                                "score",
                                                                e.target.value ? parseFloat(e.target.value) : null
                                                            )
                                                        }
                                                        className="w-16 h-8 text-center text-xs"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="border text-center text-sm bg-orange-50">
                                                {qaData?.total_score?.toFixed(0) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-orange-50">
                                                {qaData?.percentage_score?.toFixed(2) || 0}
                                            </TableCell>
                                            <TableCell className="border text-center text-sm bg-orange-50">
                                                {qaData?.weighted_score?.toFixed(2) || 0}
                                            </TableCell>

                                            {/* Final Grade */}
                                            <TableCell className="border text-center text-sm font-semibold bg-purple-50">
                                                {calculateFinalGrade(student.id)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ExcelStyleGradeGrid;
