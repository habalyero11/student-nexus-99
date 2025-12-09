import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, BookOpen, Calendar, UserCheck, Eye, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { AdminAnalytics } from "@/components/analytics/AdminAnalytics";
import { AdvisorAnalytics } from "@/components/analytics/AdvisorAnalytics";

interface DashboardStats {
  totalStudents: number;
  totalAdvisors: number;
  totalGrades: number;
  todayAttendance: number;
  myStudents?: number;
  myGrades?: number;
}

type Student = Database["public"]["Tables"]["students"]["Row"];
type Assignment = Database["public"]["Tables"]["advisor_assignments"]["Row"];

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalAdvisors: 0,
    totalGrades: 0,
    todayAttendance: 0,
    myStudents: 0,
    myGrades: 0,
  });
  const [profile, setProfile] = useState<{ role: string; first_name: string } | null>(null);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser();
        let profileData = null;
        let advisorData = null;

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("role, first_name")
            .eq("user_id", user.id)
            .single();
          profileData = data;
          setProfile(data);

          // If user is an advisor, get their advisor record and assignments
          if (data?.role === "advisor") {
            const { data: advisor } = await supabase
              .from("advisors")
              .select(`
                id,
                advisor_assignments(
                  id,
                  year_level,
                  section,
                  strand
                )
              `)
              .eq("profile_id", (await supabase.from("profiles").select("id").eq("user_id", user.id).single()).data?.id)
              .single();

            if (advisor) {
              advisorData = advisor;
              setMyAssignments(advisor.advisor_assignments || []);

              // Fetch students based on advisor assignments
              const assignments = advisor.advisor_assignments || [];
              if (assignments.length > 0) {
                const studentQueries = assignments.map(assignment => {
                  let query = supabase
                    .from("students")
                    .select("*")
                    .eq("year_level", assignment.year_level)
                    .eq("section", assignment.section);

                  if (assignment.strand) {
                    query = query.eq("strand", assignment.strand);
                  }

                  return query;
                });

                // Execute all queries and combine results
                const studentResults = await Promise.all(studentQueries);
                const allStudents: Student[] = [];
                studentResults.forEach(result => {
                  if (result.data) {
                    allStudents.push(...result.data);
                  }
                });

                // Remove duplicates based on student ID
                const uniqueStudents = allStudents.filter((student, index, self) =>
                  index === self.findIndex(s => s.id === student.id)
                );

                setMyStudents(uniqueStudents);

                // Get grades for these students
                if (uniqueStudents.length > 0) {
                  const studentIds = uniqueStudents.map(s => s.id);
                  const { count: myGradesCount } = await supabase
                    .from("grades")
                    .select("id", { count: "exact", head: true })
                    .in("student_id", studentIds);

                  // Update stats with advisor-specific data
                  setStats(prev => ({
                    ...prev,
                    myStudents: uniqueStudents.length,
                    myGrades: myGradesCount || 0,
                  }));
                }
              }
            }
          }
        }

        // Fetch general statistics (admin only)
        if (profileData?.role === "admin") {
          const [studentsRes, advisorsRes, gradesRes, attendanceRes] = await Promise.all([
            supabase.from("students").select("id", { count: "exact", head: true }),
            supabase.from("advisors").select("id", { count: "exact", head: true }),
            supabase.from("grades").select("id", { count: "exact", head: true }),
            supabase
              .from("attendance")
              .select("id", { count: "exact", head: true })
              .eq("date", new Date().toISOString().split("T")[0])
              .eq("status", "present"),
          ]);

          setStats(prev => ({
            ...prev,
            totalStudents: studentsRes.count || 0,
            totalAdvisors: advisorsRes.count || 0,
            totalGrades: gradesRes.count || 0,
            todayAttendance: attendanceRes.count || 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatCards = () => {
    if (profile?.role === "advisor") {
      // For advisors, return empty array - we'll show Quick Actions instead
      return [];
    } else {
      // Admin view
      return [
        {
          title: "Total Students",
          value: stats.totalStudents,
          icon: GraduationCap,
          description: "Enrolled students",
          color: "text-primary",
        },
        {
          title: "Advisors",
          value: stats.totalAdvisors,
          icon: Users,
          description: "Active advisors",
          color: "text-secondary",
        },
        {
          title: "Grade Records",
          value: stats.totalGrades,
          icon: BookOpen,
          description: "Total grade entries",
          color: "text-success",
        },
        {
          title: "Today's Attendance",
          value: stats.todayAttendance,
          icon: Calendar,
          description: "Present today",
          color: "text-warning",
        },
      ];
    }
  };

  const statCards = getStatCards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.first_name || "User"}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your CSU-ULS management system.
        </p>
      </div>

      {/* Stat Cards for Admin or Quick Actions for Advisor */}
      {profile?.role === "advisor" ? (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used features for efficient management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate("/students")}>
                <GraduationCap className="h-6 w-6 text-primary mb-2" />
                <p className="font-medium">View My Students</p>
                <p className="text-sm text-muted-foreground">View students under my supervision</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate("/grades")}>
                <BookOpen className="h-6 w-6 text-secondary mb-2" />
                <p className="font-medium">Input Grades</p>
                <p className="text-sm text-muted-foreground">Update student grades</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate("/attendance")}>
                <Calendar className="h-6 w-6 text-success mb-2" />
                <p className="font-medium">Take Attendance</p>
                <p className="text-sm text-muted-foreground">Mark daily attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secondary Information Section - Role-based */}
      {profile?.role === "advisor" && myAssignments.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>My Assignments</CardTitle>
            <CardDescription>
              Sections, strands, and subjects assigned to me
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myAssignments.map((assignment, index) => (
                <div key={assignment.id || index} className="p-4 bg-gradient-card rounded-lg border border-border/50">
                  <div className="space-y-3">
                    {/* Section Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Grade {assignment.year_level} - {assignment.section}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.strand ? `${assignment.strand.toUpperCase()} Strand` : "Junior High School"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.year_level}
                      </Badge>
                    </div>

                    {/* Subjects */}
                    {assignment.subjects && assignment.subjects.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Subjects:</p>
                        <div className="flex flex-wrap gap-1">
                          {assignment.subjects.map((subject, subjectIndex) => (
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

                    {/* Subject Count Summary */}
                    <div className="text-xs text-muted-foreground">
                      {assignment.subjects?.length || 0} subject{(assignment.subjects?.length || 0) !== 1 ? 's' : ''} assigned
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Predictive Analytics Section */}
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

    </div>
  );
};

export default Dashboard;