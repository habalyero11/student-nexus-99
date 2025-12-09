import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, User, ChevronDown, ChevronUp, BookOpen, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AtRiskStudent = Database["public"]["Views"]["at_risk_students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"];

interface AtRiskStudentCardProps {
  student: AtRiskStudent;
  onViewDetails?: (studentId: string) => void;
}

export const AtRiskStudentCard = ({ student, onViewDetails }: AtRiskStudentCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "High Risk":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium Risk":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low Risk":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskIcon = (riskScore: number) => {
    if (riskScore >= 70) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (riskScore >= 40) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-blue-500" />;
  };

  const fetchDetailedData = async () => {
    if (!student.student_id || loading) return;

    setLoading(true);
    try {
      // Fetch grades
      const { data: gradesData } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", student.student_id)
        .order("quarter", { ascending: true });

      // Fetch recent attendance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.student_id)
        .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: false });

      if (gradesData) setGrades(gradesData);
      if (attendanceData) setAttendance(attendanceData);
    } catch (error) {
      console.error("Error fetching detailed data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      fetchDetailedData();
    }
    setIsExpanded(!isExpanded);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 85) return "text-blue-600";
    if (grade >= 80) return "text-yellow-600";
    if (grade >= 75) return "text-orange-600";
    return "text-red-600";
  };

  const getAttendanceColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "text-green-600 bg-green-50";
      case "absent":
        return "text-red-600 bg-red-50";
      case "late":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-400">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              {student.student_name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getRiskIcon(student.risk_score || 0)}
            <Badge variant="outline" className={getRiskColor(student.risk_level || "")}>
              {student.risk_level}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {student.student_id_no} • Grade {student.year_level}-{student.section}
          {student.strand && ` • ${student.strand.toUpperCase()}`}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Average Grade</div>
            <div className={`font-medium ${(student.overall_average || 0) < 75 ? 'text-red-600' : 'text-green-600'}`}>
              {student.overall_average ? student.overall_average.toFixed(1) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Attendance</div>
            <div className={`font-medium ${(student.attendance_rate || 0) < 85 ? 'text-red-600' : 'text-green-600'}`}>
              {student.attendance_rate ? `${student.attendance_rate.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Primary Concern</div>
          <div className="text-sm bg-muted/50 p-2 rounded text-center">
            {student.primary_concern}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Recommended Action</div>
          <div className="text-xs bg-blue-50 border border-blue-200 p-2 rounded">
            {student.recommended_action}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Risk Score: <span className="font-medium">{student.risk_score}/100</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleExpand}
              className="h-7 px-2 text-xs"
              disabled={loading}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 mr-1" />
              ) : (
                <ChevronDown className="h-3 w-3 mr-1" />
              )}
              {loading ? "Loading..." : isExpanded ? "Less" : "More"}
            </Button>
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(student.student_id)}
                className="h-7 px-2 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Grades Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium">Recent Grades</h4>
              </div>
              {grades.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {grades.map((grade, index) => (
                    <div key={grade.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <div className="flex-1">
                        <div className="font-medium">{grade.subject}</div>
                        <div className="text-muted-foreground">Quarter {grade.quarter}</div>
                      </div>
                      <div className="text-right">
                        {grade.final_grade ? (
                          <div className={`font-bold ${getGradeColor(grade.final_grade)}`}>
                            {grade.final_grade.toFixed(1)}
                          </div>
                        ) : (
                          <div className="text-gray-400">Pending</div>
                        )}
                        <div className="text-muted-foreground">
                          {grade.written_work ? `WW: ${grade.written_work}` : ''}
                          {grade.performance_task ? ` PT: ${grade.performance_task}` : ''}
                          {grade.quarterly_assessment ? ` QA: ${grade.quarterly_assessment}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No grades recorded yet
                </div>
              )}
            </div>

            {/* Attendance Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-green-600" />
                <h4 className="text-sm font-medium">Recent Attendance (Last 30 days)</h4>
              </div>
              {attendance.length > 0 ? (
                <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto">
                  {attendance.slice(0, 21).map((record, index) => (
                    <div
                      key={record.id}
                      className={`text-xs p-1 rounded text-center ${getAttendanceColor(record.status)}`}
                      title={`${record.date}: ${record.status}${record.remarks ? ` - ${record.remarks}` : ''}`}
                    >
                      <div className="font-medium">
                        {new Date(record.date).getDate()}
                      </div>
                      <div className="text-[10px]">
                        {record.status.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No attendance records in the last 30 days
                </div>
              )}
            </div>

            {/* Performance Summary */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs">
              <div className="font-medium text-blue-800 mb-2">Performance Summary</div>
              <div className="grid grid-cols-2 gap-2 text-blue-700">
                <div>
                  <span className="font-medium">Quarter Averages:</span>
                  <div className="space-y-1 mt-1">
                    {student.q1_average && <div>Q1: {student.q1_average.toFixed(1)}</div>}
                    {student.q2_average && <div>Q2: {student.q2_average.toFixed(1)}</div>}
                    {student.q3_average && <div>Q3: {student.q3_average.toFixed(1)}</div>}
                    {student.q4_average && <div>Q4: {student.q4_average.toFixed(1)}</div>}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Stats:</span>
                  <div className="space-y-1 mt-1">
                    <div>Failing: {student.failing_grades || 0}</div>
                    <div>Completed: {student.completed_grades || 0}</div>
                    <div>Present: {student.present_days || 0}/{student.total_attendance_days || 0}</div>
                    <div>Trend: {student.q1_to_q2_trend}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};