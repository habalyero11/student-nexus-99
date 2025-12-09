import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { History, TrendingUp, TrendingDown, Copy, Clock, Edit3, FileText, User, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Row"];

interface GradeHistoryPanelProps {
  studentId: string;
  currentSubject?: string;
  currentQuarter?: string;
  onCopyFromPrevious?: (grade: Grade) => void;
}

interface GradeWithTrend {
  grade: Grade;
  trend?: 'up' | 'down' | 'same';
  difference?: number;
}

interface GradeHistoryRecord {
  id: string;
  grade_id: string;
  student_id: string;
  subject: string;
  quarter: string;
  old_written_work: number | null;
  old_performance_task: number | null;
  old_quarterly_assessment: number | null;
  old_final_grade: number | null;
  old_remarks: string | null;
  new_written_work: number | null;
  new_performance_task: number | null;
  new_quarterly_assessment: number | null;
  new_final_grade: number | null;
  new_remarks: string | null;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_at: string;
  change_reason: string | null;
  user_email?: string;
}

const GradeHistoryPanel = ({ studentId, currentSubject, currentQuarter, onCopyFromPrevious }: GradeHistoryPanelProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<GradeWithTrend[]>([]);
  const [auditTrail, setAuditTrail] = useState<GradeHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
      fetchGradeHistory();
      fetchAuditTrail();
    }
  }, [studentId, currentSubject]);

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (error) throw error;
      setStudent(data);
    } catch (error) {
      console.error("Error fetching student:", error);
    }
  };

  const fetchGradeHistory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .order("quarter", { ascending: false });

      // If a specific subject is selected, filter by that subject
      if (currentSubject) {
        query = query.eq("subject", currentSubject);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Calculate trends
      const gradesWithTrends: GradeWithTrend[] = [];

      if (data) {
        for (let i = 0; i < data.length; i++) {
          const currentGrade = data[i];
          const previousGrade = i < data.length - 1 ? data[i + 1] : null;

          let trend: 'up' | 'down' | 'same' | undefined;
          let difference: number | undefined;

          if (previousGrade && currentGrade.final_grade && previousGrade.final_grade) {
            const diff = currentGrade.final_grade - previousGrade.final_grade;
            if (Math.abs(diff) >= 0.5) {
              trend = diff > 0 ? 'up' : 'down';
              difference = Math.abs(diff);
            } else {
              trend = 'same';
            }
          }

          gradesWithTrends.push({
            grade: currentGrade,
            trend,
            difference,
          });
        }
      }

      setGrades(gradesWithTrends);
    } catch (error) {
      console.error("Error fetching grade history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      setAuditLoading(true);

      let query = supabase
        .from("grade_history")
        .select(`
          *,
          profiles!grade_history_changed_by_fkey (
            id, first_name, last_name, email
          )
        `)
        .eq("student_id", studentId)
        .order("changed_at", { ascending: false });

      // If a specific subject is selected, filter by that subject
      if (currentSubject) {
        query = query.eq("subject", currentSubject);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Transform data to include user email
      const auditRecords: GradeHistoryRecord[] = (data || []).map(record => ({
        ...record,
        user_email: record.profiles?.email || 'Unknown User'
      }));

      setAuditTrail(auditRecords);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
    } finally {
      setAuditLoading(false);
    }
  };

  const getQuarterOrder = (quarter: string): number => {
    const order = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
    return order[quarter as keyof typeof order] || 0;
  };

  const getPreviousQuarterGrades = () => {
    if (!currentQuarter || !currentSubject) return [];

    const currentQuarterOrder = getQuarterOrder(currentQuarter);
    const previousQuarters = ['1st', '2nd', '3rd', '4th'].filter(q => getQuarterOrder(q) < currentQuarterOrder);

    return grades.filter(g =>
      g.grade.subject === currentSubject &&
      previousQuarters.includes(g.grade.quarter)
    );
  };

  const getGradeColor = (grade: number | null): string => {
    if (!grade) return "text-muted-foreground";
    if (grade >= 90) return "text-green-600";
    if (grade >= 85) return "text-blue-600";
    if (grade >= 80) return "text-yellow-600";
    if (grade >= 75) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeRemarks = (grade: number | null): string => {
    if (!grade) return "No Grade";
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  const handleCopyGrade = (grade: Grade) => {
    onCopyFromPrevious?.(grade);
  };

  if (!student) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Select a student to view grade history
          </div>
        </CardContent>
      </Card>
    );
  }

  const previousQuarterGrades = getPreviousQuarterGrades();
  const recentGrades = grades.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Student Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Grade Context & History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div>
              <div className="font-medium">{student.first_name} {student.last_name}</div>
              <div className="text-sm text-muted-foreground">
                {student.student_id_no} • Grade {student.year_level} - {student.section}
              </div>
            </div>
          </div>

          <Tabs defaultValue="grades" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grades" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Grade History
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Audit Trail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="space-y-4">
              {/* Current Subject Previous Quarters */}
              {currentSubject && previousQuarterGrades.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    {currentSubject} - Previous Quarters
                  </div>
                  <div className="space-y-1">
                    {previousQuarterGrades.map(({ grade, trend, difference }) => (
                      <div key={grade.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{grade.quarter}</Badge>
                          {trend && (
                            <div className="flex items-center gap-1">
                              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                              {difference && (
                                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                  {trend === 'up' ? '+' : '-'}{difference.toFixed(1)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getGradeColor(grade.final_grade)}`}>
                            {grade.final_grade?.toFixed(1) || "—"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyGrade(grade)}
                            className="h-6 w-6 p-0"
                            title="Copy grade components"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Summary */}
              {recentGrades.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Recent Performance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-green-600 font-medium">
                        {recentGrades.filter(g => g.grade.final_grade && g.grade.final_grade >= 85).length}
                      </div>
                      <div className="text-green-600">High Grades</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="text-yellow-600 font-medium">
                        {recentGrades.filter(g => g.grade.final_grade && g.grade.final_grade < 75).length}
                      </div>
                      <div className="text-yellow-600">Need Help</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Grades */}
              <ScrollArea className="h-48">
                {loading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading history...
                  </div>
                ) : grades.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No grades recorded yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentGrades.map(({ grade, trend, difference }) => (
                      <div key={grade.id} className="p-2 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{grade.subject}</span>
                            <Badge variant="outline" className="text-xs">{grade.quarter}</Badge>
                            {trend && (
                              <div className="flex items-center gap-1">
                                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                                {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                              </div>
                            )}
                          </div>
                          <span className={`font-medium ${getGradeColor(grade.final_grade)}`}>
                            {grade.final_grade?.toFixed(1) || "—"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getGradeRemarks(grade.final_grade)}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1 text-xs">
                          <div>WW: {grade.written_work?.toFixed(1) || "—"}</div>
                          <div>PT: {grade.performance_task?.toFixed(1) || "—"}</div>
                          <div>QA: {grade.quarterly_assessment?.toFixed(1) || "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <ScrollArea className="h-64">
                {auditLoading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading audit trail...
                  </div>
                ) : auditTrail.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No audit records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditTrail.map((record) => (
                      <div key={record.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              record.action_type === 'INSERT' ? 'default' :
                              record.action_type === 'UPDATE' ? 'secondary' :
                              'destructive'
                            } className="text-xs">
                              {record.action_type === 'INSERT' ? 'Created' :
                               record.action_type === 'UPDATE' ? 'Updated' :
                               'Deleted'}
                            </Badge>
                            <span className="text-sm font-medium">{record.subject}</span>
                            <Badge variant="outline" className="text-xs">{record.quarter}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(record.changed_at), { addSuffix: true })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{record.user_email}</span>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span>{new Date(record.changed_at).toLocaleString()}</span>
                        </div>

                        {record.action_type === 'UPDATE' && (
                          <div className="text-xs space-y-1">
                            {record.old_final_grade !== record.new_final_grade && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Final Grade:</span>
                                <span className="text-red-600">{record.old_final_grade?.toFixed(1) || '—'}</span>
                                <span>→</span>
                                <span className="text-green-600">{record.new_final_grade?.toFixed(1) || '—'}</span>
                              </div>
                            )}
                            {record.old_written_work !== record.new_written_work && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Written Work:</span>
                                <span className="text-red-600">{record.old_written_work?.toFixed(1) || '—'}</span>
                                <span>→</span>
                                <span className="text-green-600">{record.new_written_work?.toFixed(1) || '—'}</span>
                              </div>
                            )}
                            {record.old_performance_task !== record.new_performance_task && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Performance Task:</span>
                                <span className="text-red-600">{record.old_performance_task?.toFixed(1) || '—'}</span>
                                <span>→</span>
                                <span className="text-green-600">{record.new_performance_task?.toFixed(1) || '—'}</span>
                              </div>
                            )}
                            {record.old_quarterly_assessment !== record.new_quarterly_assessment && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Quarterly Assessment:</span>
                                <span className="text-red-600">{record.old_quarterly_assessment?.toFixed(1) || '—'}</span>
                                <span>→</span>
                                <span className="text-green-600">{record.new_quarterly_assessment?.toFixed(1) || '—'}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {record.change_reason && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <FileText className="h-3 w-3 inline mr-1" />
                            {record.change_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeHistoryPanel;