import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Award,
  AlertTriangle,
  Calendar,
  BarChart3
} from "lucide-react";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Row"];

interface StudentPerformanceTrendsProps {
  studentId?: string;
  showAllStudents?: boolean;
  userRole?: string;
  advisorAssignments?: any[];
}

interface GradeData {
  quarter: string;
  subject: string;
  final_grade: number;
  written_work: number | null;
  performance_task: number | null;
  quarterly_assessment: number | null;
  created_at: string;
}

interface TrendData {
  quarter: string;
  average: number;
  highest: number;
  lowest: number;
  count: number;
}

interface SubjectPerformance {
  subject: string;
  average: number;
  trend: 'up' | 'down' | 'stable';
  grades: GradeData[];
}

const StudentPerformanceTrends = ({
  studentId,
  showAllStudents = false,
  userRole,
  advisorAssignments
}: StudentPerformanceTrendsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId || "");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const quarters = ["1st", "2nd", "3rd", "4th"];

  // Grade performance colors
  const gradeColors = {
    excellent: "#10b981", // green-500
    good: "#3b82f6",      // blue-500
    average: "#f59e0b",   // yellow-500
    below: "#ef4444"      // red-500
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentGrades();
    }
  }, [selectedStudentId, selectedPeriod]);

  useEffect(() => {
    if (grades.length > 0) {
      calculateTrends();
      calculateSubjectPerformance();
    }
  }, [grades]);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      if (userRole === "advisor" && advisorAssignments) {
        // Filter students by advisor assignments
        const { data, error } = await query;
        if (error) throw error;

        const filteredStudents = data?.filter(student => {
          return advisorAssignments.some(assignment => {
            const matchesYearLevel = student.year_level === assignment.year_level;
            const matchesSection = student.section === assignment.section;
            if (assignment.strand) {
              const matchesStrand = student.strand === assignment.strand;
              return matchesYearLevel && matchesSection && matchesStrand;
            } else {
              return matchesYearLevel && matchesSection;
            }
          });
        }) || [];

        setStudents(filteredStudents);
      } else {
        // Admin sees all students
        const { data, error } = await query;
        if (error) throw error;
        setStudents(data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchStudentGrades = async () => {
    if (!selectedStudentId) return;

    setLoading(true);
    try {
      // Get student info
      const student = students.find(s => s.id === selectedStudentId);
      setSelectedStudent(student || null);

      // Build query for grades
      let query = supabase
        .from("grades")
        .select("*")
        .eq("student_id", selectedStudentId)
        .order("created_at", { ascending: true });

      // Filter by selected period if not "all"
      if (selectedPeriod !== "all") {
        query = query.eq("quarter", selectedPeriod);
      }

      const { data, error } = await query;
      if (error) throw error;

      setGrades(data || []);
    } catch (error) {
      console.error("Error fetching grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = () => {
    const trendsByQuarter = quarters.map(quarter => {
      const quarterGrades = grades.filter(g => g.quarter === quarter);

      if (quarterGrades.length === 0) {
        return {
          quarter,
          average: 0,
          highest: 0,
          lowest: 0,
          count: 0
        };
      }

      const finalGrades = quarterGrades.map(g => g.final_grade);
      const average = finalGrades.reduce((sum, grade) => sum + grade, 0) / finalGrades.length;
      const highest = Math.max(...finalGrades);
      const lowest = Math.min(...finalGrades);

      return {
        quarter,
        average: Math.round(average * 100) / 100,
        highest,
        lowest,
        count: quarterGrades.length
      };
    });

    setTrendData(trendsByQuarter);
  };

  const calculateSubjectPerformance = () => {
    const subjectMap = new Map<string, GradeData[]>();

    // Group grades by subject
    grades.forEach(grade => {
      if (!subjectMap.has(grade.subject)) {
        subjectMap.set(grade.subject, []);
      }
      subjectMap.get(grade.subject)!.push(grade);
    });

    // Calculate performance for each subject
    const subjectPerf: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, subjectGrades]) => {
      const finalGrades = subjectGrades.map(g => g.final_grade);
      const average = finalGrades.reduce((sum, grade) => sum + grade, 0) / finalGrades.length;

      // Calculate trend (comparing first and last quarters)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (subjectGrades.length >= 2) {
        const sortedGrades = subjectGrades.sort((a, b) => quarters.indexOf(a.quarter) - quarters.indexOf(b.quarter));
        const firstGrade = sortedGrades[0].final_grade;
        const lastGrade = sortedGrades[sortedGrades.length - 1].final_grade;
        const difference = lastGrade - firstGrade;

        if (difference > 2) trend = 'up';
        else if (difference < -2) trend = 'down';
      }

      return {
        subject,
        average: Math.round(average * 100) / 100,
        trend,
        grades: subjectGrades
      };
    });

    // Sort by average performance
    subjectPerf.sort((a, b) => b.average - a.average);
    setSubjectPerformance(subjectPerf);
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return gradeColors.excellent;
    if (grade >= 85) return gradeColors.good;
    if (grade >= 80) return gradeColors.average;
    return gradeColors.below;
  };

  const getGradeRemark = (grade: number): string => {
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getComponentBreakdownData = () => {
    if (!grades.length) return [];

    const data = quarters.map(quarter => {
      const quarterGrades = grades.filter(g => g.quarter === quarter);

      if (quarterGrades.length === 0) {
        return {
          quarter,
          writtenWork: 0,
          performanceTask: 0,
          quarterlyAssessment: 0
        };
      }

      const avgWW = quarterGrades.reduce((sum, g) => sum + (g.written_work || 0), 0) / quarterGrades.length;
      const avgPT = quarterGrades.reduce((sum, g) => sum + (g.performance_task || 0), 0) / quarterGrades.length;
      const avgQA = quarterGrades.reduce((sum, g) => sum + (g.quarterly_assessment || 0), 0) / quarterGrades.length;

      return {
        quarter,
        writtenWork: Math.round(avgWW * 100) / 100,
        performanceTask: Math.round(avgPT * 100) / 100,
        quarterlyAssessment: Math.round(avgQA * 100) / 100
      };
    });

    return data;
  };

  if (!showAllStudents && !selectedStudentId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a student to view performance trends</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Selection */}
      {showAllStudents && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Student Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {student.student_id_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {quarters.map(quarter => (
                      <SelectItem key={quarter} value={quarter}>{quarter} Quarter</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStudent && (
        <>
          {/* Student Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.first_name} {selectedStudent.middle_name} {selectedStudent.last_name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedStudent.student_id_no} • Grade {selectedStudent.year_level} - {selectedStudent.section}
                    {selectedStudent.strand && ` (${selectedStudent.strand.toUpperCase()})`}
                  </p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {grades.length} Grade Records
                </Badge>
              </div>
            </CardContent>
          </Card>

          {grades.length > 0 ? (
            <>
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {trendData.reduce((sum, q) => sum + q.average, 0) / trendData.filter(q => q.count > 0).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Average</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.max(...trendData.map(q => q.highest).filter(h => h > 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">Highest Grade</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.min(...trendData.map(q => q.lowest).filter(l => l > 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">Lowest Grade</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {subjectPerformance.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Subjects</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quarterly Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quarterly Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis domain={[70, 100]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="average"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Average Grade"
                      />
                      <Area
                        type="monotone"
                        dataKey="highest"
                        stroke="#10b981"
                        fill="transparent"
                        name="Highest"
                      />
                      <Area
                        type="monotone"
                        dataKey="lowest"
                        stroke="#ef4444"
                        fill="transparent"
                        name="Lowest"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Grade Components Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Grade Components Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getComponentBreakdownData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="writtenWork" fill="#f59e0b" name="Written Work (25%)" />
                      <Bar dataKey="performanceTask" fill="#3b82f6" name="Performance Task (50%)" />
                      <Bar dataKey="quarterlyAssessment" fill="#10b981" name="Quarterly Assessment (25%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Subject Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Subject Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {subjectPerformance.map((subject, index) => (
                        <div key={subject.subject} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{subject.subject}</div>
                            {getTrendIcon(subject.trend)}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-medium" style={{ color: getGradeColor(subject.average) }}>
                                {subject.average.toFixed(1)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getGradeRemark(subject.average)}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {subject.grades.length} record{subject.grades.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No grade records found for this student</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StudentPerformanceTrends;