import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface Student {
    id: string;
    student_id_no: string;
    first_name: string;
    last_name: string;
}

interface QuarterGrade {
    quarter: string;
    final_grade: number;
    remarks: string;
}

interface StudentSummary {
    student: Student;
    q1: QuarterGrade | null;
    q2: QuarterGrade | null;
    q3: QuarterGrade | null;
    q4: QuarterGrade | null;
    average: number;
    finalRemarks: string;
}

interface GradeSummarySheetProps {
    yearLevel: string;
    section: string;
    subject: string;
    gradingSystem: GradingSystem | null;
}

const GradeSummarySheet = ({
    yearLevel,
    section,
    subject,
    gradingSystem,
}: GradeSummarySheetProps) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [summaryData, setSummaryData] = useState<StudentSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [yearLevel, section, subject]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch students
            const { data: studentsData, error: studentsError } = await supabase
                .from("students")
                .select("id, student_id_no, first_name, last_name")
                .eq("year_level", yearLevel)
                .eq("section", section)
                .order("last_name", { ascending: true })
                .order("first_name", { ascending: true });

            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            // Fetch grades for all quarters
            const studentIds = studentsData?.map(s => s.id) || [];
            const { data: gradesData, error: gradesError } = await supabase
                .from("grades")
                .select("student_id, quarter, final_grade, remarks")
                .in("student_id", studentIds)
                .eq("subject", subject);

            if (gradesError) throw gradesError;

            // Organize summary data
            const summary: StudentSummary[] = (studentsData || []).map(student => {
                const studentGrades = gradesData?.filter(g => g.student_id === student.id) || [];

                const q1 = studentGrades.find(g => g.quarter === "1st");
                const q2 = studentGrades.find(g => g.quarter === "2nd");
                const q3 = studentGrades.find(g => g.quarter === "3rd");
                const q4 = studentGrades.find(g => g.quarter === "4th");

                const grades = [
                    q1?.final_grade,
                    q2?.final_grade,
                    q3?.final_grade,
                    q4?.final_grade,
                ].filter(g => g !== undefined && g !== null) as number[];

                const average = grades.length > 0
                    ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
                    : 0;

                let finalRemarks = "Not Graded";
                if (average > 0 && gradingSystem && gradingSystem.grade_scale) {
                    for (const range of gradingSystem.grade_scale) {
                        if (average >= range.min && average <= range.max) {
                            finalRemarks = range.label;
                            break;
                        }
                    }
                }

                return {
                    student,
                    q1: q1 ? { quarter: "1st", final_grade: q1.final_grade, remarks: q1.remarks } : null,
                    q2: q2 ? { quarter: "2nd", final_grade: q2.final_grade, remarks: q2.remarks } : null,
                    q3: q3 ? { quarter: "3rd", final_grade: q3.final_grade, remarks: q3.remarks } : null,
                    q4: q4 ? { quarter: "4th", final_grade: q4.final_grade, remarks: q4.remarks } : null,
                    average,
                    finalRemarks,
                };
            });

            setSummaryData(summary);
        } catch (error) {
            console.error("Error fetching summary data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Loading summary...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center text-2xl">
                    Yearly Summary - {subject}
                </CardTitle>
                <div className="text-center text-muted-foreground">
                    Grade {yearLevel} - Section {section}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="border text-center">#</TableHead>
                                <TableHead rowSpan={2} className="border text-center min-w-[200px]">
                                    LEARNER'S NAME
                                </TableHead>
                                <TableHead colSpan={2} className="border text-center bg-blue-50">
                                    FIRST QUARTER
                                </TableHead>
                                <TableHead colSpan={2} className="border text-center bg-green-50">
                                    SECOND QUARTER
                                </TableHead>
                                <TableHead colSpan={2} className="border text-center bg-orange-50">
                                    THIRD QUARTER
                                </TableHead>
                                <TableHead colSpan={2} className="border text-center bg-purple-50">
                                    FOURTH QUARTER
                                </TableHead>
                                <TableHead rowSpan={2} className="border text-center bg-yellow-50 font-semibold">
                                    FINAL GRADE
                                </TableHead>
                                <TableHead rowSpan={2} className="border text-center bg-yellow-100 font-semibold">
                                    REMARKS
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="border text-center text-xs bg-blue-50">Grade</TableHead>
                                <TableHead className="border text-center text-xs bg-blue-50">Remarks</TableHead>
                                <TableHead className="border text-center text-xs bg-green-50">Grade</TableHead>
                                <TableHead className="border text-center text-xs bg-green-50">Remarks</TableHead>
                                <TableHead className="border text-center text-xs bg-orange-50">Grade</TableHead>
                                <TableHead className="border text-center text-xs bg-orange-50">Remarks</TableHead>
                                <TableHead className="border text-center text-xs bg-purple-50">Grade</TableHead>
                                <TableHead className="border text-center text-xs bg-purple-50">Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaryData.map((data, idx) => (
                                <TableRow key={data.student.id}>
                                    <TableCell className="border text-center">{idx + 1}</TableCell>
                                    <TableCell className="border">
                                        {data.student.last_name}, {data.student.first_name}
                                    </TableCell>

                                    {/* Q1 */}
                                    <TableCell className="border text-center bg-blue-50/50">
                                        {data.q1?.final_grade || "-"}
                                    </TableCell>
                                    <TableCell className="border text-center text-xs bg-blue-50/50">
                                        {data.q1?.remarks || "-"}
                                    </TableCell>

                                    {/* Q2 */}
                                    <TableCell className="border text-center bg-green-50/50">
                                        {data.q2?.final_grade || "-"}
                                    </TableCell>
                                    <TableCell className="border text-center text-xs bg-green-50/50">
                                        {data.q2?.remarks || "-"}
                                    </TableCell>

                                    {/* Q3 */}
                                    <TableCell className="border text-center bg-orange-50/50">
                                        {data.q3?.final_grade || "-"}
                                    </TableCell>
                                    <TableCell className="border text-center text-xs bg-orange-50/50">
                                        {data.q3?.remarks || "-"}
                                    </TableCell>

                                    {/* Q4 */}
                                    <TableCell className="border text-center bg-purple-50/50">
                                        {data.q4?.final_grade || "-"}
                                    </TableCell>
                                    <TableCell className="border text-center text-xs bg-purple-50/50">
                                        {data.q4?.remarks || "-"}
                                    </TableCell>

                                    {/* Final */}
                                    <TableCell className="border text-center font-semibold bg-yellow-50">
                                        {data.average || "-"}
                                    </TableCell>
                                    <TableCell className="border text-center text-xs font-semibold bg-yellow-100">
                                        {data.finalRemarks}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default GradeSummarySheet;
