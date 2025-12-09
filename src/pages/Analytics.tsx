import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, FileDown, TrendingUp } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AdminAnalytics } from "@/components/analytics/AdminAnalytics";
import { AdvisorAnalytics } from "@/components/analytics/AdvisorAnalytics";
import StudentPerformanceTrends from "@/components/analytics/StudentPerformanceTrends";
import ReportGenerator from "@/components/reports/ReportGenerator";

type Assignment = Database["public"]["Tables"]["advisor_assignments"]["Row"];

const Analytics = () => {
  const [profile, setProfile] = useState<{ role: string; first_name: string } | null>(null);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [showPerformanceTrends, setShowPerformanceTrends] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("role, first_name")
            .eq("user_id", user.id)
            .single();
          setProfile(data);

          // If user is an advisor, get their assignments
          if (data?.role === "advisor") {
            const { data: advisor } = await supabase
              .from("advisors")
              .select(`
                id,
                advisor_assignments(
                  id,
                  year_level,
                  section,
                  strand,
                  subjects
                )
              `)
              .eq("profile_id", (await supabase.from("profiles").select("id").eq("user_id", user.id).single()).data?.id)
              .single();

            if (advisor) {
              setMyAssignments(advisor.advisor_assignments || []);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          {profile?.role === "admin"
            ? "Comprehensive system analytics and performance insights"
            : "Performance analytics for your assigned sections"}
        </p>
      </div>

      {/* Enhanced Analytics Tools */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics Tools
          </CardTitle>
          <CardDescription>
            Advanced analytics and reporting tools for data-driven insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-medium">Performance Trends</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize student performance over time
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPerformanceTrends(true)}
                className="w-full"
              >
                View Trends
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <FileDown className="h-6 w-6 text-secondary" />
                <div>
                  <h3 className="font-medium">Generate Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Export detailed performance reports
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportGenerator(true)}
                className="w-full"
              >
                Create Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Section */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Analytics
          </CardTitle>
          <CardDescription>
            {profile?.role === "admin"
              ? "System-wide performance insights and at-risk student identification"
              : "Performance analytics for your assigned sections"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.role === "admin" ? (
            <AdminAnalytics />
          ) : profile?.role === "advisor" ? (
            <AdvisorAnalytics
              advisorAssignments={myAssignments}
              userId={profile?.first_name || "advisor"}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Analytics not available for your role
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Generator Modal */}
      <ReportGenerator
        isOpen={showReportGenerator}
        onClose={() => setShowReportGenerator(false)}
      />

      {/* Performance Trends Modal */}
      {showPerformanceTrends && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Student Performance Trends</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPerformanceTrends(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <StudentPerformanceTrends
                showAllStudents={true}
                userRole={profile?.role}
                advisorAssignments={myAssignments}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;