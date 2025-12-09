import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PerformanceChart } from "./PerformanceChart";
import { AtRiskStudentCard } from "./AtRiskStudentCard";
import { AlertTriangle, Users, TrendingUp, TrendingDown, Eye, BarChart3, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";

type AtRiskStudent = Database["public"]["Views"]["advisor_at_risk_students"]["Row"];
type SectionAnalyticsData = Database["public"]["Views"]["advisor_section_performance"]["Row"];

interface Assignment {
  year_level: string;
  section: string;
  strand?: string;
}

interface AdvisorAnalyticsProps {
  advisorAssignments: Assignment[];
  userId: string;
}

export const AdvisorAnalytics = ({ advisorAssignments, userId }: AdvisorAnalyticsProps) => {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [sectionData, setSectionData] = useState<SectionAnalyticsData[]>([]);
  const [myStudentsStats, setMyStudentsStats] = useState({
    totalStudents: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    outstanding: 0,
    verySatisfactory: 0,
    satisfactory: 0,
    fairlySatisfactory: 0,
    needsImprovement: 0,
    improvingStudents: 0,
    decliningStudents: 0,
    averageGrade: 0,
    averageAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdvisorAnalytics = async () => {
      if (advisorAssignments.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Get current user profile to get profile_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        // Fetch at-risk students using the new advisor-specific view
        const { data: atRiskData } = await supabase
          .from("advisor_at_risk_students")
          .select("*")
          .eq("advisor_profile_id", profile.id)
          .order("risk_score", { ascending: false })
          .limit(showAllAtRisk ? 50 : 6);

        if (atRiskData) {
          setAtRiskStudents(atRiskData);
        }

        // Fetch section performance using the new advisor-specific view
        const { data: sectionPerformanceData } = await supabase
          .from("advisor_section_performance")
          .select("*")
          .eq("advisor_profile_id", profile.id)
          .order("year_level, section");

        if (sectionPerformanceData) {
          setSectionData(sectionPerformanceData);

          // Calculate aggregate statistics for advisor's students
          const stats = {
            totalStudents: 0,
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            outstanding: 0,
            verySatisfactory: 0,
            satisfactory: 0,
            fairlySatisfactory: 0,
            needsImprovement: 0,
            improvingStudents: 0,
            decliningStudents: 0,
            averageGrade: 0,
            averageAttendance: 0,
          };

          sectionPerformanceData.forEach(section => {
            stats.totalStudents += section.total_students || 0;
            stats.highRisk += section.high_risk_count || 0;
            stats.mediumRisk += section.medium_risk_count || 0;
            stats.lowRisk += section.low_risk_count || 0;
            stats.outstanding += section.outstanding_students || 0;
            stats.verySatisfactory += section.very_satisfactory_students || 0;
            stats.satisfactory += section.satisfactory_students || 0;
            stats.fairlySatisfactory += section.fairly_satisfactory_students || 0;
            stats.needsImprovement += section.needs_improvement_students || 0;
            stats.improvingStudents += section.improving_students || 0;
            stats.decliningStudents += section.declining_students || 0;
          });

          // Calculate weighted averages
          if (sectionPerformanceData.length > 0 && stats.totalStudents > 0) {
            stats.averageGrade = sectionPerformanceData.reduce((acc, section) => {
              return acc + (section.section_average_for_subjects || 0) * (section.total_students || 0);
            }, 0) / stats.totalStudents;

            stats.averageAttendance = sectionPerformanceData.reduce((acc, section) => {
              return acc + (section.average_attendance_rate || 0) * (section.total_students || 0);
            }, 0) / stats.totalStudents;
          }

          setMyStudentsStats(stats);
        }

      } catch (error) {
        console.error("Error fetching advisor analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisorAnalytics();
  }, [advisorAssignments, showAllAtRisk, userId]);

  const handleViewStudentDetails = (studentId: string) => {
    navigate(`/students?student=${studentId}`);
  };

  const handleViewSectionDetails = (yearLevel: string, section: string, strand?: string) => {
    navigate(`/students?year=${yearLevel}&section=${section}${strand ? `&strand=${strand}` : ""}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (advisorAssignments.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardContent className="text-center py-8">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">No sections assigned</div>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your administrator to get section assignments
          </p>
        </CardContent>
      </Card>
    );
  }

  const atRiskPercentage = myStudentsStats.totalStudents > 0
    ? (((myStudentsStats.highRisk + myStudentsStats.mediumRisk + myStudentsStats.lowRisk) / myStudentsStats.totalStudents) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* My Sections Overview */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            My Sections Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Performance summary for all assigned sections
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Students */}
            <div className="text-center p-4 bg-gradient-card rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{myStudentsStats.totalStudents}</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>

            {/* At-Risk Students */}
            <div className="text-center p-4 bg-gradient-card rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {myStudentsStats.highRisk + myStudentsStats.mediumRisk + myStudentsStats.lowRisk}
              </div>
              <div className="text-sm text-muted-foreground">At-Risk ({atRiskPercentage}%)</div>
              <div className="flex gap-1 justify-center mt-2">
                <Badge variant="destructive" className="text-xs">H: {myStudentsStats.highRisk}</Badge>
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">M: {myStudentsStats.mediumRisk}</Badge>
                <Badge variant="outline" className="text-xs">L: {myStudentsStats.lowRisk}</Badge>
              </div>
            </div>

            {/* Average Grade */}
            <div className="text-center p-4 bg-gradient-card rounded-lg">
              <div className={`text-2xl font-bold ${myStudentsStats.averageGrade >= 85 ? 'text-green-600' : myStudentsStats.averageGrade >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                {myStudentsStats.averageGrade.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Average Grade</div>
            </div>

            {/* Performance Trends */}
            <div className="text-center p-4 bg-gradient-card rounded-lg">
              <div className="flex justify-center gap-4">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">{myStudentsStats.improvingStudents}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">{myStudentsStats.decliningStudents}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Performance Trends</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <PerformanceChart
          title="My Students Performance Distribution"
          data={{
            outstanding: myStudentsStats.outstanding,
            verySatisfactory: myStudentsStats.verySatisfactory,
            satisfactory: myStudentsStats.satisfactory,
            fairlySatisfactory: myStudentsStats.fairlySatisfactory,
            needsImprovement: myStudentsStats.needsImprovement,
          }}
          chartType="pie"
        />

        {/* Section Health Summary */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">My Sections Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionData.map((section, index) => (
              <div key={`${section.year_level}-${section.section}`} className="p-4 bg-gradient-card rounded-lg border border-border/50">
                <div className="space-y-3">
                  {/* Section Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        Grade {section.year_level} - {section.section}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {section.strand ? `${section.strand.toUpperCase()} • ` : ""}{section.total_students} students
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      section.section_health === "Excellent" ? "border-green-200 text-green-800 bg-green-50" :
                      section.section_health === "Good" ? "border-blue-200 text-blue-800 bg-blue-50" :
                      section.section_health === "Average" ? "border-yellow-200 text-yellow-800 bg-yellow-50" :
                      section.section_health === "Monitor Closely" ? "border-orange-200 text-orange-800 bg-orange-50" :
                      "border-red-200 text-red-800 bg-red-50"
                    }>
                      {section.section_health}
                    </Badge>
                  </div>

                  {/* My Subjects for this Section */}
                  {section.subjects && section.subjects.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">My Subjects:</p>
                      <div className="flex flex-wrap gap-1">
                        {section.subjects.map((subject, subjectIndex) => (
                          <Badge
                            key={subjectIndex}
                            variant="outline"
                            className="text-xs px-2 py-1 bg-primary/5 text-primary border-primary/20"
                          >
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg Grade: <span className="font-medium">{section.section_average_for_subjects?.toFixed(1) || 'N/A'}</span></span>
                    <span>At Risk: <span className="font-medium text-orange-600">{(section.high_risk_count || 0) + (section.medium_risk_count || 0) + (section.low_risk_count || 0)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students in My Sections */}
      {atRiskStudents.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  At-Risk Students in My Sections
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Students requiring immediate attention and intervention
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAllAtRisk(!showAllAtRisk)}
              >
                {showAllAtRisk ? "Show Less" : "Show More"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {atRiskStudents.map((student) => (
                <AtRiskStudentCard
                  key={student.student_id}
                  student={student}
                  onViewDetails={handleViewStudentDetails}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/students")}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <Users className="h-6 w-6 text-blue-600" />
              <span>View My Students</span>
              <span className="text-xs text-muted-foreground">Manage student records</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/grades")}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <BarChart3 className="h-6 w-6 text-green-600" />
              <span>Input Grades</span>
              <span className="text-xs text-muted-foreground">Update student grades</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/attendance")}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <GraduationCap className="h-6 w-6 text-purple-600" />
              <span>Take Attendance</span>
              <span className="text-xs text-muted-foreground">Mark daily attendance</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};