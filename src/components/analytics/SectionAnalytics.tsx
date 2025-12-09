import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Eye, Users, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type SectionAnalytics = Database["public"]["Views"]["section_performance_analytics"]["Row"];

interface SectionAnalyticsProps {
  sections: SectionAnalytics[];
  onViewSection?: (yearLevel: string, section: string, strand?: string) => void;
}

export const SectionAnalytics = ({ sections, onViewSection }: SectionAnalyticsProps) => {
  const getSectionHealthColor = (health: string) => {
    switch (health) {
      case "Excellent":
        return "bg-green-100 text-green-800 border-green-200";
      case "Good":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Average":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Monitor Closely":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Needs Attention":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "Excellent":
      case "Good":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "Average":
        return <Users className="h-4 w-4 text-yellow-600" />;
      case "Monitor Closely":
      case "Needs Attention":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, index) => (
          <Card key={`${section.year_level}-${section.section}-${section.strand || 'none'}`} className="shadow-soft hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    Grade {section.year_level} - {section.section}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {section.strand ? `${section.strand.toUpperCase()} Strand` : "Junior High School"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getHealthIcon(section.section_health || "")}
                  <Badge variant="outline" className={getSectionHealthColor(section.section_health || "")}>
                    {section.section_health}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Student Count and Risk Overview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{section.total_students} Students</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {section.students_with_risk} at risk
                </div>
              </div>

              {/* Section Average */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Section Average</span>
                  <span className={`font-medium ${(section.section_average || 0) >= 85 ? 'text-green-600' : (section.section_average || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {section.section_average ? section.section_average.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, ((section.section_average || 0) / 100) * 100))}
                  className="h-2"
                />
              </div>

              {/* Risk Distribution */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Risk Distribution</div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="destructive" className="text-xs">
                    High: {section.high_risk_count}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                    Med: {section.medium_risk_count}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Low: {section.low_risk_count}
                  </Badge>
                </div>
              </div>

              {/* Performance Distribution */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Performance Levels</div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-green-600">{section.outstanding_students}</div>
                    <div className="text-muted-foreground">Outstanding</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-600">{section.very_satisfactory_students}</div>
                    <div className="text-muted-foreground">V.Sat</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">{section.needs_improvement_students}</div>
                    <div className="text-muted-foreground">Needs Imp.</div>
                  </div>
                </div>
              </div>

              {/* Trend Indicators */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">{section.improving_students}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{section.declining_students}</span>
                </div>
                <div className="text-muted-foreground">
                  Stable: {section.stable_students}
                </div>
              </div>

              {/* Attendance Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Attendance</span>
                  <span className={`font-medium ${(section.average_attendance_rate || 0) >= 90 ? 'text-green-600' : (section.average_attendance_rate || 0) >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {section.average_attendance_rate ? `${section.average_attendance_rate.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <Progress
                  value={section.average_attendance_rate || 0}
                  className="h-2"
                />
              </div>

              {/* View Details Button */}
              {onViewSection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewSection(
                    section.year_level.toString(),
                    section.section,
                    section.strand || undefined
                  )}
                  className="w-full h-8 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <Card className="shadow-soft">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">No sections found</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};