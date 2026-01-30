import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    User,
    GraduationCap,
    BookOpen,
    Calendar,
    School,
    LogOut,
    Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Student {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    student_id_no: string;
    student_lrn: string;
    year_level: string;
    section: string;
    strand?: string;
    must_change_password?: boolean;
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
}

interface AttendanceRecord {
    id: string;
    date: string;
    status: string;
    remarks?: string;
}

const statusLabel: Record<string, string> = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };

import { ChangePasswordDialog } from "@/components/student/ChangePasswordDialog";

const StudentPortal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [student, setStudent] = useState<Student | null>(null);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    useEffect(() => {
        const state = location.state as { student?: Student; grades?: Grade[]; attendance?: AttendanceRecord[] } | null;

        if (!state || !state.student) {
            toast({
                variant: "destructive",
                title: "Session expired",
                description: "Please log in again to view your portal.",
            });
            navigate("/");
            return;
        }

        setStudent(state.student);
        setGrades(state.grades || []);
        setAttendance(state.attendance || []);

        if (state.student.must_change_password) {
            setChangePasswordOpen(true);
        }

        setLoading(false);
    }, [location.state, navigate, toast]);

    const handleLogout = async () => {
        navigate("/");
    };

    const handlePasswordChanged = () => {
        setChangePasswordOpen(false);
        if (student) {
            setStudent({ ...student, must_change_password: false });
        }
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
                                        <Badge variant="outline" className="border-white/40 text-white bg-white/10">ID: {student.student_id_no}</Badge>
                                        <Badge variant="outline" className="border-white/40 text-white bg-white/10">Grade {student.year_level} - {student.section}</Badge>
                                        {student.strand && (
                                            <Badge variant="outline" className="border-white/40 text-white bg-white/10">{student.strand.toUpperCase()}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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

                        <TabsContent value="grades" className="space-y-6">
                            {grades.length > 0 && (() => {
                                const q: Record<string, number[]> = { '1st': [], '2nd': [], '3rd': [], '4th': [] };
                                grades.forEach(grade => {
                                    const f = grade.final_grade ?? ((grade.written_work || 0) * 0.25 + (grade.performance_task || 0) * 0.5 + (grade.quarterly_assessment || 0) * 0.25);
                                    if (f > 0 && q[grade.quarter]) q[grade.quarter].push(f);
                                });
                                const avg = (k: string) => { const g = q[k]; return g.length ? g.reduce((a, b) => a + b, 0) / g.length : null; };
                                const q1 = avg('1st'), q2 = avg('2nd'), q3 = avg('3rd'), q4 = avg('4th');
                                const all = [q1, q2, q3, q4].filter(Boolean) as number[];
                                const overall = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
                                const col = (v: number | null) => v == null ? "text-muted-foreground" : v >= 90 ? "text-green-600" : v >= 85 ? "text-blue-600" : v >= 80 ? "text-yellow-600" : v >= 75 ? "text-orange-600" : "text-red-600";
                                const bg = (v: number | null) => v == null ? "bg-muted/30" : v >= 90 ? "bg-green-50" : v >= 85 ? "bg-blue-50" : v >= 80 ? "bg-yellow-50" : v >= 75 ? "bg-orange-50" : "bg-red-50";
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
                                                {(['1st', '2nd', '3rd', '4th'] as const).map(qq => (
                                                    <div key={qq} className={`text-center p-3 rounded-lg ${bg(avg(qq))}`}>
                                                        <div className="text-xs text-muted-foreground mb-1">Q{qq[0]} Average</div>
                                                        <div className={`text-xl font-bold ${col(avg(qq))}`}>{avg(qq) != null ? avg(qq)!.toFixed(1) : "—"}</div>
                                                    </div>
                                                ))}
                                                <div className={`text-center p-3 rounded-lg border-2 border-primary/20 ${bg(overall)}`}>
                                                    <div className="text-xs text-muted-foreground mb-1 font-medium">Overall</div>
                                                    <div className={`text-2xl font-bold ${col(overall)}`}>{overall != null ? overall.toFixed(1) : "—"}</div>
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
                                    <CardDescription>Your recorded grades for the current academic year</CardDescription>
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
                                                        const f = grade.final_grade ?? ((grade.written_work || 0) * 0.25 + (grade.performance_task || 0) * 0.5 + (grade.quarterly_assessment || 0) * 0.25);
                                                        return (
                                                            <TableRow key={grade.id}>
                                                                <TableCell className="font-medium">{grade.subject}</TableCell>
                                                                <TableCell>{grade.quarter}</TableCell>
                                                                <TableCell className="text-center">{grade.written_work ?? "-"}</TableCell>
                                                                <TableCell className="text-center">{grade.performance_task ?? "-"}</TableCell>
                                                                <TableCell className="text-center">{grade.quarterly_assessment ?? "-"}</TableCell>
                                                                <TableCell className="text-center font-bold text-primary">{f ? f.toFixed(2) : "-"}</TableCell>
                                                                <TableCell className="max-w-[200px]">
                                                                    {grade.remarks ? (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="flex items-start gap-1 cursor-pointer">
                                                                                    <Sparkles className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                                                                                    <span className="text-xs text-muted-foreground line-clamp-2">{grade.remarks}</span>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="max-w-[300px] p-3">
                                                                                <div className="space-y-1">
                                                                                    <div className="flex items-center gap-1 text-purple-600 font-medium text-xs"><Sparkles className="h-3 w-3" /> AI-Generated Feedback</div>
                                                                                    <p className="text-sm">{grade.remarks}</p>
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
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

                        <TabsContent value="attendance" className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        Attendance Record
                                    </CardTitle>
                                    <CardDescription>Your recent attendance history</CardDescription>
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
                                                                {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        record.status === "present" ? "bg-green-50 text-green-700 border-green-200" :
                                                                            record.status === "absent" ? "bg-red-50 text-red-700 border-red-200" :
                                                                                record.status === "late" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                                    "bg-gray-50 text-gray-700 border-gray-200"
                                                                    }
                                                                >
                                                                    {statusLabel[record.status] ?? record.status}
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
                                            <p className="text-base font-medium">{student.first_name} {student.middle_name} {student.last_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">LRN</h4>
                                            <p className="text-base">{student.student_lrn}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Birth Date</h4>
                                            <p className="text-base">{(student as any).birth_date ? new Date((student as any).birth_date).toLocaleDateString() : "Not provided"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Age</h4>
                                            <p className="text-base">{(student as any).age ? `${(student as any).age} years old` : "Not provided"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Gender</h4>
                                            <p className="text-base capitalize">{(student as any).gender || "Not provided"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                                            <p className="text-base">{(student as any).contact_number || "Not provided"}</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                                            <p className="text-base">{(student as any).address || "Not provided"}</p>
                                        </div>
                                        <Separator className="md:col-span-2 my-2" />
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Guardian</h4>
                                            <p className="text-base">{(student as any).guardian_name || "Not provided"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-muted-foreground">Guardian Contact</h4>
                                            <p className="text-base">{(student as any).parent_contact_no || "Not provided"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {student && (
                <ChangePasswordDialog
                    open={changePasswordOpen}
                    onSuccess={handlePasswordChanged}
                    studentId={student.id}
                    mustChangePassword={student.must_change_password}
                />
            )}
        </div>
    );
};

export default StudentPortal;
