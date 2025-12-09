import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, AlertTriangle, Shield } from "lucide-react";

interface RiskMetricsProps {
  totalStudents: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  improvingStudents: number;
  decliningStudents: number;
  systemHealth: string;
  averageGrade: number;
  averageAttendance: number;
}

export const RiskMetrics = ({
  totalStudents,
  highRisk,
  mediumRisk,
  lowRisk,
  improvingStudents,
  decliningStudents,
  systemHealth,
  averageGrade,
  averageAttendance,
}: RiskMetricsProps) => {
  const atRiskTotal = highRisk + mediumRisk + lowRisk;
  const atRiskPercentage = totalStudents > 0 ? ((atRiskTotal / totalStudents) * 100).toFixed(1) : "0";

  const getHealthColor = (health: string) => {
    switch (health) {
      case "Excellent":
        return "bg-green-100 text-green-800 border-green-200";
      case "Good":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Average":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Needs Attention":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "Excellent":
      case "Good":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "Average":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "Needs Attention":
      case "Critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* System Health Overview */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{systemHealth}</div>
              <div className="flex items-center gap-2 mt-2">
                {getHealthIcon(systemHealth)}
                <Badge variant="outline" className={getHealthColor(systemHealth)}>
                  {systemHealth}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Overview */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            At-Risk Students
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-orange-600">
            {atRiskTotal}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {atRiskPercentage}% of total students
          </div>
          <div className="flex gap-1 mt-3">
            <Badge variant="destructive" className="text-xs">
              High: {highRisk}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
              Med: {mediumRisk}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Low: {lowRisk}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">Improving</span>
              </div>
              <span className="text-lg font-semibold text-green-600">
                {improvingStudents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm">Declining</span>
              </div>
              <span className="text-lg font-semibold text-red-600">
                {decliningStudents}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Avg. Grade</div>
            <div className={`text-xl font-bold ${averageGrade >= 85 ? 'text-green-600' : averageGrade >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
              {averageGrade.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Avg. Attendance</div>
            <div className={`text-xl font-bold ${averageAttendance >= 90 ? 'text-green-600' : averageAttendance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {averageAttendance.toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};