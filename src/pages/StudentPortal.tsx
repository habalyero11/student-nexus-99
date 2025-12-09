import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    User,
    GraduationCap,
    BookOpen,
    Calendar,
    ArrowLeft,
    School,
    LogOut,
    Download
} from "lucide-react";

interface Student {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    birth_place?: string;
    birth_date?: string;
    address?: string;
    student_id_no: string;
    student_lrn: string;
    year_level: string;
    section: string;
    strand?: string;
    age?: number;
    gender?: string;
    contact_number?: string;
    guardian_name?: string;
    parent_contact_no?: string;
}

interface Grade {
    id: string;
    subject: string;
    quarter: string;
    written_work?: number;
    performance_task?: number;
    quarterly_assessment?: number;
    final_grade?: number;
    remarks?: string;
    created_at: string;
}

interface AttendanceRecord {
    id: string;
    date: string;
    status: string;
    remarks?: string;
    created_at: string;
}

const StudentPortal = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [student, setStudent] = useState<Student | null>(null);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentId) {
            fetchStudentData(studentId);
        } else {
            navigate("/");
        }
    }, [studentId]);

    const fetchStudentData = async (idNo: string) => {
        try {
            setLoading(true);

            // Fetch student details
            const { data: studentData, error: studentError } = await supabase
                .from("students")
                .select("*")
                .eq("student_id_no", idNo)
                .single();

            if (studentError) {
                throw new Error("Student not found");
            }

            setStudent(studentData);

            // Fetch grades
            const { data: gradesData, error: gradesError } = await supabase
                .from("grades")
                .select("*")
                .eq("student_id", studentData.id)
                .order("quarter", { ascending: true })
                .order("subject", { ascending: true });

            if (gradesError) throw gradesError;
            setGrades(gradesData || []);

            // Fetch attendance
            const { data: attendanceData, error: attendanceError } = await supabase
                .from("attendance")
                .select("*")
                .eq("student_id", studentData.id)
                .order("date", { ascending: false })
                .limit(50);

            if (attendanceError) throw attendanceError;
            setAttendance(attendanceData || []);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to load student data",
            });
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        navigate("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!student) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-30">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <School className="h-6 w-6" />
                        <span>ULS-CSU Nexus</span>
                        <Badge variant="secondary" className="ml-2">Student Portal</Badge>
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        Exit
                    </Button>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Student Profile Header */}
                    <Card className="border-none shadow-md bg-gradient-to-r from-primary/90 to-primary text-primary-foreground">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-white border-4 border-white/30">
                                    <User className="h-12 w-12" />
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-2">
                                    <h1 className="text-3xl font-bold">
                                        {student.first_name} {student.middle_name} {student.last_name}
                                    </h1>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start text-primary-foreground/90">
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="border-white/40 text-white bg-white/10">
                                                ID: {student.student_id_no}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="border-white/40 text-white bg-white/10">
                                                Grade {student.year_level} - {student.section}
                                            </Badge>
                                        </div>
                                        {student.strand && (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline" className="border-white/40 text-white bg-white/10">
                                                    {student.strand.toUpperCase()}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content Tabs */}
                    <Tabs defaultValue="grades" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mx-auto lg:mx-0 mb-6">
                            <TabsTrigger value="grades" className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Grades
                            </TabsTrigger>
                            <TabsTrigger value="attendance" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Attendance
                            </TabsTrigger>
                            <TabsTrigger value="personal" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Profile
                            </TabsTrigger>
                        </TabsList>

                        {/* Grades Tab */}
                        <TabsContent value="grades" className="space-y-6">
                            {/* Overall Average Summary */}
                            {grades.length > 0 && (() => {
                                // Calculate quarterly averages
                                const quarterlyGrades: { [key: string]: number[] } = {
                                    '1st': [], '2nd': [], '3rd': [], '4th': []
                                };

                                grades.forEach(grade => {
                                    const finalGrade = grade.final_grade || (
                                        ((grade.written_work || 0) * 0.25) +
                                        ((grade.performance_task || 0) * 0.50) +
                                        ((grade.quarterly_assessment || 0) * 0.25)
                                    );
                                    if (finalGrade > 0 && quarterlyGrades[grade.quarter]) {
                                        quarterlyGrades[grade.quarter].push(finalGrade);
                                    }
                                });

                                const getQuarterAvg = (quarter: string) => {
                                    const gradesList = quarterlyGrades[quarter];
                                    if (gradesList.length === 0) return null;
                                    return gradesList.reduce((a, b) => a + b, 0) / gradesList.length;
                                };

                                const q1Avg = getQuarterAvg('1st');
                                const q2Avg = getQuarterAvg('2nd');
                                const q3Avg = getQuarterAvg('3rd');
                                const q4Avg = getQuarterAvg('4th');

                                // Calculate overall average from quarterly averages
                                const validQuarters = [q1Avg, q2Avg, q3Avg, q4Avg].filter(q => q !== null) as number[];
                                const overallAvg = validQuarters.length > 0
                                    ? validQuarters.reduce((a, b) => a + b, 0) / validQuarters.length
                                    : null;

                                const getGradeColor = (grade: number | null) => {
                                    if (grade === null) return "text-muted-foreground";
                                    if (grade >= 90) return "text-green-600";
                                    if (grade >= 85) return "text-blue-600";
                                    if (grade >= 80) return "text-yellow-600";
                                    if (grade >= 75) return "text-orange-600";
                                    return "text-red-600";
                                };

                                const getGradeBg = (grade: number | null) => {
                                    if (grade === null) return "bg-muted/30";
                                    if (grade >= 90) return "bg-green-50";
                                    if (grade >= 85) return "bg-blue-50";
                                    if (grade >= 80) return "bg-yellow-50";
                                    if (grade >= 75) return "bg-orange-50";
                                    return "bg-red-50";
                                };

                                return (
                                    <Card className="border-none shadow-md bg-gradient-to-r from-primary/5 to-primary/10">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <GraduationCap className="h-5 w-5 text-primary" />
                                                Grade Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                {/* Q1 Average */}
                                                <div className={`text-center p-3 rounded-lg ${getGradeBg(q1Avg)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1">Q1 Average</div>
                                                    <div className={`text-xl font-bold ${getGradeColor(q1Avg)}`}>
                                                        {q1Avg !== null ? q1Avg.toFixed(1) : "—"}
                                                    </div>
                                                </div>
                                                {/* Q2 Average */}
                                                <div className={`text-center p-3 rounded-lg ${getGradeBg(q2Avg)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1">Q2 Average</div>
                                                    <div className={`text-xl font-bold ${getGradeColor(q2Avg)}`}>
                                                        {q2Avg !== null ? q2Avg.toFixed(1) : "—"}
                                                    </div>
                                                </div>
                                                {/* Q3 Average */}
                                                <div className={`text-center p-3 rounded-lg ${getGradeBg(q3Avg)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1">Q3 Average</div>
                                                    <div className={`text-xl font-bold ${getGradeColor(q3Avg)}`}>
                                                        {q3Avg !== null ? q3Avg.toFixed(1) : "—"}
                                                    </div>
                                                </div>
                                                {/* Q4 Average */}
                                                <div className={`text-center p-3 rounded-lg ${getGradeBg(q4Avg)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1">Q4 Average</div>
                                                    <div className={`text-xl font-bold ${getGradeColor(q4Avg)}`}>
                                                        {q4Avg !== null ? q4Avg.toFixed(1) : "—"}
                                                    </div>
                                                </div>
                                                {/* Overall Average */}
                                                <div className={`text-center p-3 rounded-lg border-2 border-primary/20 ${getGradeBg(overallAvg)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1 font-medium">Overall Average</div>
                                                    <div className={`text-2xl font-bold ${getGradeColor(overallAvg)}`}>
                                                        {overallAvg !== null ? overallAvg.toFixed(1) : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        Academic Performance
                                    </CardTitle>
                                    <CardDescription>
                                        Your recorded grades for the current academic year
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {grades.length === 0 ? (
                                        <div className="text-center py-12 bg-muted/30 rounded-lg">
                                            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-muted-foreground">No grades recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[30%]">Subject</TableHead>
                                                        <TableHead>Quarter</TableHead>
                                                        <TableHead className="text-center">Written (25%)</TableHead>
                                                        <TableHead className="text-center">Perf. Task (50%)</TableHead>
                                                        <TableHead className="text-center">Assessment (25%)</TableHead>
                                                        <TableHead className="text-center font-bold">Final Grade</TableHead>
                                                        <TableHead>Remarks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {grades.map((grade) => {
                                                        const finalGrade = grade.final_grade || (
                                                            ((grade.written_work || 0) * 0.25) +
                                                            ((grade.performance_task || 0) * 0.50) +
                                                            ((grade.quarterly_assessment || 0) * 0.25)
                                                        );

                                                        return (
                                                            <TableRow key={grade.id}>
                                                                <TableCell className="font-medium">{grade.subject}</TableCell>
                                                                <TableCell>{grade.quarter}</TableCell>
                                                                <TableCell className="text-center">{grade.written_work || "-"}</TableCell>
                                                                <TableCell className="text-center">{grade.performance_task || "-"}</TableCell>
                                                                <TableCell className="text-center">{grade.quarterly_assessment || "-"}</TableCell>
                                                                <TableCell className="text-center font-bold text-primary">
                                                                    {finalGrade ? finalGrade.toFixed(2) : "-"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {grade.remarks ? (
                                                                        <Badge variant={grade.remarks === "Passed" ? "default" : "destructive"}>
                                                                            {grade.remarks}
                                                                        </Badge>
                                                                    ) : "-"}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Attendance Tab */}
                        <TabsContent value="attendance" className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        Attendance Record
                                    </CardTitle>
                                    <CardDescription>
                                        Your recent attendance history
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {attendance.length === 0 ? (
                                        <div className="text-center py-12 bg-muted/30 rounded-lg">
                                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-muted-foreground">No attendance records found.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Remarks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attendance.map((record) => (
                                                        <TableRow key={record.id}>
                                                            <TableCell className="font-medium">
                                                                {new Date(record.date).toLocaleDateString(undefined, {
                                                                    weekday: 'long',
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        record.status === "Present" ? "bg-green-50 text-green-700 border-green-200" :
                                                                            record.status === "Absent" ? "bg-red-50 text-red-700 border-red-200" :
                                                                                record.status === "Late" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                                    "bg-gray-50 text-gray-700 border-gray-200"
                                                                    }
                                                                >
                                                                    {record.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{record.remarks || "-"}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Personal Info Tab */}
                        <TabsContent value="personal" className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                                            <p className="text-base font-medium">
                                                {student.first_name} {student.middle_name} {student.last_name}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Learner Reference Number (LRN)</h4>
                                            <p className="text-base">{student.student_lrn}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Birth Date</h4>
                                            <p className="text-base">
                                                {student.birth_date ? new Date(student.birth_date).toLocaleDateString() : "Not provided"}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Age</h4>
                                            <p className="text-base">{student.age ? `${student.age} years old` : "Not provided"}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Gender</h4>
                                            <p className="text-base capitalize">{student.gender || "Not provided"}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Contact Number</h4>
                                            <p className="text-base">{student.contact_number || "Not provided"}</p>
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                                            <p className="text-base">{student.address || "Not provided"}</p>
                                        </div>

                                        <Separator className="md:col-span-2 my-2" />

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Guardian Name</h4>
                                            <p className="text-base">{student.guardian_name || "Not provided"}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Guardian Contact</h4>
                                            <p className="text-base">{student.parent_contact_no || "Not provided"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default StudentPortal;
