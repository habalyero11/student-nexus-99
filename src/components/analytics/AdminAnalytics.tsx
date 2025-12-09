import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RiskMetrics } from "./RiskMetrics";
import { PerformanceChart } from "./PerformanceChart";
import { AtRiskStudentCard } from "./AtRiskStudentCard";
import { SectionAnalytics } from "./SectionAnalytics";
import { AlertTriangle, Users, TrendingUp, TrendingDown, Eye, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";

type SystemAnalytics = Database["public"]["Views"]["system_performance_analytics"]["Row"];
type AtRiskStudent = Database["public"]["Views"]["at_risk_students"]["Row"];
type SectionAnalyticsData = Database["public"]["Views"]["section_performance_analytics"]["Row"];

export const AdminAnalytics = () => {
  const [systemData, setSystemData] = useState<SystemAnalytics | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [sectionData, setSectionData] = useState<SectionAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch system-wide analytics
        const { data: systemAnalytics } = await supabase
          .from("system_performance_analytics")
          .select("*")
          .single();

        if (systemAnalytics) {
          setSystemData(systemAnalytics);
        }

        // Fetch top at-risk students (limit to 6 for overview)
        const { data: atRiskData } = await supabase
          .from("at_risk_students")
          .select("*")
          .order("risk_score", { ascending: false })
          .limit(showAllAtRisk ? 50 : 6);

        if (atRiskData) {
          setAtRiskStudents(atRiskData);
        }

        // Fetch section analytics (top performing and concerning sections)
        const { data: sectionAnalytics } = await supabase
          .from("section_performance_analytics")
          .select("*")
          .order("section_average", { ascending: false });

        if (sectionAnalytics) {
          setSectionData(sectionAnalytics);
        }

      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [showAllAtRisk]);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!systemData) {
    return (
      <Card className="shadow-soft">
        <CardContent className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">No analytics data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Metrics Overview */}
      <RiskMetrics
        totalStudents={systemData.total_students || 0}
        highRisk={systemData.high_risk_count || 0}
        mediumRisk={systemData.medium_risk_count || 0}
        lowRisk={systemData.low_risk_count || 0}
        improvingStudents={systemData.improving_students || 0}
        decliningStudents={systemData.declining_students || 0}
        systemHealth={systemData.system_health || "Unknown"}
        averageGrade={systemData.system_average_grade || 0}
        averageAttendance={systemData.system_average_attendance || 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution Chart */}
        <PerformanceChart
          title="Overall Performance Distribution"
          data={{
            outstanding: systemData.outstanding_count || 0,
            verySatisfactory: systemData.very_satisfactory_count || 0,
            satisfactory: systemData.satisfactory_count || 0,
            fairlySatisfactory: systemData.fairly_satisfactory_count || 0,
            needsImprovement: systemData.needs_improvement_count || 0,
          }}
          chartType="bar"
        />

        {/* Critical Alerts */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">Critical Alerts</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/students?filter=at-risk")}
              >
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemData.high_risk_count > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">High Risk Students</span>
                </div>
                <p className="text-sm text-red-700">
                  {systemData.high_risk_count} students require immediate intervention
                </p>
              </div>
            )}

            {systemData.declining_students > 5 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Performance Decline</span>
                </div>
                <p className="text-sm text-orange-700">
                  {systemData.declining_students} students showing declining performance
                </p>
              </div>
            )}

            {systemData.system_average_attendance < 85 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Low Attendance</span>
                </div>
                <p className="text-sm text-yellow-700">
                  System-wide attendance is below target ({systemData.system_average_attendance?.toFixed(1)}%)
                </p>
              </div>
            )}

            {systemData.improving_students > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Positive Trends</span>
                </div>
                <p className="text-sm text-green-700">
                  {systemData.improving_students} students showing improvement
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students */}
      {atRiskStudents.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  At-Risk Students
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Students requiring attention and intervention
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

      {/* Section Analytics */}
      {sectionData.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Section Performance Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Performance analytics by section and grade level
            </p>
          </CardHeader>
          <CardContent>
            <SectionAnalytics
              sections={sectionData}
              onViewSection={handleViewSectionDetails}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};